// v4: дашборд — одна доска виджетов, сетка 12 колонок (ссылки, папки, заметки, погода)
const LS_KEY = 'browser-desktop-v1';
const $ = (s) => document.querySelector(s);

// Подборка в духе Bonjourr/Unsplash (прямые CDN-ссылки, без API-ключа)
const CURATED = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=1920&auto=format&fit=crop',
];
const PRESETS = [
  'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
  'linear-gradient(135deg,#2b1055,#7597de)',
  'linear-gradient(135deg,#134e5e,#71b280)',
  '#14141c', '#0d1117', '#e8e4da',
];
const DEF_RECT = { link: { fw: 0.15, fh: 0.30 }, folder: { fw: 0.15, fh: 0.30 }, note: { fw: 0.34, fh: 0.42 }, checklist: { fw: 0.34, fh: 0.50 }, weather: { fw: 0.26, fh: 0.34 }, currency: { fw: 0.24, fh: 0.28 }, crypto: { fw: 0.26, fh: 0.30 }, quote: { fw: 0.34, fh: 0.24 } };
const MIN_PX = { link: [96, 104], folder: [96, 110], note: [170, 120], checklist: [180, 150], weather: [160, 120], currency: [150, 110], crypto: [160, 110], quote: [200, 100] };
const VROWS = 8; // виртуальных строк для пересчёта старой сетки в свободные координаты
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function fracOverlap(a, b) {
  return a.fx < b.fx + b.fw && a.fx + a.fw > b.fx && a.fy < b.fy + b.fh && a.fy + a.fh > b.fy;
}
function pxOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function boardRects(exceptId) {
  const zr = $('#grid').getBoundingClientRect();
  return state.board
    .filter((o) => o.id !== exceptId && typeof o.fx === 'number')
    .map((o) => ({ x: o.fx * zr.width, y: o.fy * zr.height, w: o.fw * zr.width, h: o.fh * zr.height }));
}
function hitsAny(r, exceptId) {
  return boardRects(exceptId).some((o) => pxOverlap(r, o));
}
// первое свободное место под размер (долями), иначе левый верх
function findFreeSpot(fw, fh) {
  for (let y = 0.02; y + fh <= 1.001; y += 0.03) {
    for (let x = 0.02; x + fw <= 1.001; x += 0.03) {
      const c = { fx: x, fy: y, fw, fh };
      if (!state.board.some((o) => typeof o.fx === 'number' && fracOverlap(c, o))) return { fx: x, fy: y };
    }
  }
  return { fx: 0.02, fy: 0.02 };
}
function cascadeRect(t) {
  const d = DEF_RECT[t] || DEF_RECT.link;
  const k = (state.board.length % 6) * 0.05;
  const c = { fx: Math.min(k, 1 - d.fw), fy: Math.min(k, 1 - d.fh), fw: d.fw, fh: d.fh };
  if (!state.board.some((o) => typeof o.fx === 'number' && fracOverlap(c, o))) return c;
  const s = findFreeSpot(d.fw, d.fh);
  return { ...c, ...s };
}
function placeOnBoard(item) {
  if (item.fx === undefined) Object.assign(item, cascadeRect(item.type));
}

const I18N = {
ru: {
  newTab: 'Новая вкладка', addBtn: '+ Добавить', emptyBoard: 'Пусто — включи ✎ и добавь первое',
  folderEmpty: 'Пусто — нажми + сверху, чтобы добавить', nextBg: 'Следующий фон', editMode: 'Редактировать',
  settings: 'Настройки', photo: 'Фото:', folderAdd: 'Добавить закладку', itemsCount: '{0} эл.', emptyList: 'пусто',
  wNew: 'Новое', wEdit: 'Изменить', wNewLink: 'Новая ссылка', wNewFolder: 'Новая папка', wNewWidget: 'Новый виджет',
  wType: 'Тип', tLink: 'Ссылка', tFolder: 'Папка', tNote: 'Заметка', tChecklist: 'Чек-лист', tWeather: 'Погода',
  tCurrency: 'Курсы валют', tCrypto: 'Крипта', tQuote: 'Цитата дня',
  fTitle: 'Название', fUrl: 'URL', fCity: 'Город', fCur: 'Текущая погода', fDays: 'Дней (0–7)', fHours: 'Часов (0–24, шаг 3)',
  fBase: 'Базовая валюта', fSyms: 'Валюты', fCoins: 'Монеты через запятую',
  save: 'Сохранить', cancel: 'Отмена', sTitle: 'Настройки', sBg: '🖼 Фон', sSrc: 'Источник',
  sCurated: 'Карусель (подборка)', sCustom: 'Свои картинки (ссылки)', sUpload: 'Своя картинка (файл)',
  sGradient: 'Градиент', sColor: 'Цвет', sNextBg: 'Следующий фон', sShuffle: 'Случайный', sChange: 'Смена фона',
  int0: 'При каждом открытии', int1: 'Каждую минуту', int5: 'Каждые 5 минут', int15: 'Каждые 15 минут',
  int30: 'Каждые 30 минут', int1440: 'Раз в день',
  sCustomUrls: 'Свои URL (по одному на строку)', sUploadFile: 'Файл с компьютера', sUploadClear: 'Убрать файл',
  sColorVal: 'Цвет / градиент CSS', sBlur: 'Блюр:', sDim: 'Затемнение:', sLook: '🎨 Оформление',
  sTheme: 'Тема текста', sThemeDark: 'Белая (для фото)', sThemeLight: 'Тёмная (для светлого)', sClock: 'Показывать часы',
  sLang: 'Язык', sLangAuto: 'Авто (язык браузера)', sData: '💾 Данные', sAbout: 'ℹ️ О приложении',
  resetBtn: 'Сброс', done: 'Готово',
  mOpen: 'Открыть', mCopy: 'Копировать ссылку', mEdit: 'Изменить', mRename: 'Переименовать',
  mToBoard: 'Вынести на доску', mDel: 'Удалить', mAddLink: 'Создать ссылку', mAddFolder: 'Создать папку',
  mAddWidget: 'Создать виджет', mEditCity: 'Изменить город', mSetupWeather: 'Настроить погоду',
  mSetupCurr: 'Настроить валюты', mSetupCoins: 'Настроить монеты',
  needUrl: 'Вставь URL', delOne: 'Удалить «{0}»?', delFolder: 'Удалить папку «{0}» с содержимым ({1})?',
  selfNest: 'Нельзя вложить папку в саму себя', onlyBoard: 'Этот виджет живёт только на доске',
  badBackup: 'Битый файл бэкапа', resetConfirm: 'Стереть все ссылки и настройки?', badFile: 'Не смог прочитать файл',
  noCity: 'Нет города', setCity: 'Укажи город (✎)', noConn: 'Нет связи', noData: 'Нет данных',
  noCurr: 'Нет валют — настрой ✎', untitled: 'Без названия', all: 'все', add: 'Добавить', newItem: '+ пункт',
  writePh: 'Пиши...', remove: 'Убрать', resize: 'Размер', editTip: 'Изменить', delTip: 'Удалить',
  toBoardTip: 'Вынести на доску',
  dragHint: 'Отпусти за окном — вынести на доску', crumbDrop: 'Перейти. Сюда же можно перетащить элемент',   setupHint: 'Настрой отображение (✎)', quoteAnother: 'Другая цитата', fetchingTitle: 'Подтягиваю название…',
  aboutText: 'Локальный рабочий стол новой вкладки. Всё хранится в твоём браузере.', kofi: '☕ Поддержать на Ko-fi',
  donateTitle: '❤️ Поддержать', donateText: 'Если нравится проект — поддержите разработку',
},
en: {
  newTab: 'New Tab', addBtn: '+ Add', emptyBoard: 'Empty — enable ✎ and add your first',
  folderEmpty: 'Empty — press + above to add', nextBg: 'Next background', editMode: 'Edit',
  settings: 'Settings', photo: 'Photo:', folderAdd: 'Add bookmark', itemsCount: '{0} items', emptyList: 'empty',
  wNew: 'New', wEdit: 'Edit', wNewLink: 'New link', wNewFolder: 'New folder', wNewWidget: 'New widget',
  wType: 'Type', tLink: 'Link', tFolder: 'Folder', tNote: 'Note', tChecklist: 'Checklist', tWeather: 'Weather',
  tCurrency: 'Currency', tCrypto: 'Crypto', tQuote: 'Quote of the day',
  fTitle: 'Name', fUrl: 'URL', fCity: 'City', fCur: 'Current weather', fDays: 'Days (0–7)', fHours: 'Hours (0–24, step 3)',
  fBase: 'Base currency', fSyms: 'Currencies', fCoins: 'Coins, comma separated',
  save: 'Save', cancel: 'Cancel', sTitle: 'Settings', sBg: '🖼 Background', sSrc: 'Source',
  sCurated: 'Carousel (curated)', sCustom: 'Own images (links)', sUpload: 'Own image (file)',
  sGradient: 'Gradient', sColor: 'Color', sNextBg: 'Next background', sShuffle: 'Random', sChange: 'Rotate every',
  int0: 'On every open', int1: 'Every minute', int5: 'Every 5 minutes', int15: 'Every 15 minutes',
  int30: 'Every 30 minutes', int1440: 'Once a day',
  sCustomUrls: 'Own URLs (one per line)', sUploadFile: 'File from computer', sUploadClear: 'Remove file',
  sColorVal: 'Color / CSS gradient', sBlur: 'Blur:', sDim: 'Dim:', sLook: '🎨 Appearance',
  sTheme: 'Text theme', sThemeDark: 'White (for photos)', sThemeLight: 'Dark (for light)', sClock: 'Show clock',
  sLang: 'Language', sLangAuto: 'Auto (browser language)', sData: '💾 Data', sAbout: 'ℹ️ About',
  resetBtn: 'Reset', done: 'Done',
  mOpen: 'Open', mCopy: 'Copy link', mEdit: 'Edit', mRename: 'Rename',
  mToBoard: 'Move to board', mDel: 'Delete', mAddLink: 'Create link', mAddFolder: 'Create folder',
  mAddWidget: 'Create widget', mEditCity: 'Change city', mSetupWeather: 'Configure weather',
  mSetupCurr: 'Configure currencies', mSetupCoins: 'Configure coins',
  needUrl: 'Paste a URL', delOne: 'Delete “{0}”?', delFolder: 'Delete folder “{0}” with {1} items?',
  selfNest: 'Cannot nest a folder into itself', onlyBoard: 'This widget lives on the board only',
  badBackup: 'Broken backup file', resetConfirm: 'Erase all links and settings?', badFile: 'Could not read file',
  noCity: 'No city', setCity: 'Set a city (✎)', noConn: 'Offline', noData: 'No data',
  noCurr: 'No currencies — configure (✎)', untitled: 'Untitled', all: 'all', add: 'Add', newItem: '+ item',
  writePh: 'Write...', remove: 'Remove', resize: 'Resize', editTip: 'Edit', delTip: 'Delete',
  toBoardTip: 'Move to board',
  dragHint: 'Drop outside the window — move to board', crumbDrop: 'Go. You can also drop an item here',   setupHint: 'Configure display (✎)', quoteAnother: 'Another quote', fetchingTitle: 'Fetching title…',
  aboutText: 'Local new-tab desktop. Everything stays in your browser.', kofi: '☕ Support on Ko-fi',
  donateTitle: '❤️ Support', donateText: 'If you like the project — support development',
},
};
function lang() {
  const l = state.settings.lang || 'auto';
  if (l === 'ru' || l === 'en') return l;
  return (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
}
function t(key, ...a) {
  const d = (I18N[lang()] && I18N[lang()][key]) || I18N.en[key] || key;
  return String(d).replace(/\{(\d)\}/g, (_, i) => (a[+i] ?? ''));
}
function loc() { return lang() === 'ru' ? 'ru-RU' : 'en-US'; }
function applyI18n() {
  document.documentElement.lang = lang();
  document.title = t('newTab');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  const fv = $('#folderView');
  if (fv) fv.dataset.draghint = t('dragHint');
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function defaultState() {
  const navRu = (navigator.language || 'en').toLowerCase().startsWith('ru');
  return {
    settings: {
      theme: 'dark',
      showClock: true,
      bg: { mode: 'curated', blur: 3, dim: 35, intervalMin: 30, index: Math.floor(Math.random() * CURATED.length), lastChange: 0, customUrls: [], upload: '', color: PRESETS[0] },
    },
    geo: {},
    board: [
      { id: uid(), type: 'folder', title: navRu ? 'Доки' : 'Docs', fx: 0.02, fy: 0.02, fw: 0.15, fh: 0.30, children: [
        { id: uid(), type: 'link', title: 'MDN', url: 'https://developer.mozilla.org' },
        { id: uid(), type: 'link', title: 'GitHub', url: 'https://github.com' },
        { id: uid(), type: 'link', title: 'Stack Overflow', url: 'https://stackoverflow.com' },
      ]},
      { id: uid(), type: 'link', title: 'YouTube', url: 'https://youtube.com', fx: 0.19, fy: 0.02, fw: 0.15, fh: 0.30 },
      { id: uid(), type: 'note', title: navRu ? 'Заметки' : 'Notes', text: navRu ? '• первая мысль' : '• first thought', fx: 0.36, fy: 0.02, fw: 0.34, fh: 0.42 },
      { id: uid(), type: 'weather', title: navRu ? 'Погода' : 'Weather', city: 'Москва', fx: 0.72, fy: 0.02, fw: 0.24, fh: 0.30 },
    ],
  };
}

function toWidget(it) {
  const base = { id: it.id || uid(), type: it.type, title: it.title || t('untitled'), w: 2, h: 2 };
  if (it.type === 'folder') return { ...base, children: Array.isArray(it.children) ? it.children : [] };
  return { ...base, url: it.url || '' };
}
// раскладка старых виджетов с сетки (w/h) в свободные координаты — потоком слева направо
function flowLayout(list) {
  let x = 0, y = 0, rowH = 0;
  list.forEach((it) => {
    const fw = clamp((+it.w || 2) / 12, 0.06, 1);
    const fh = clamp((+it.h || 2) / VROWS, 0.08, 1);
    if (x + fw > 1.001) { x = 0; y += rowH; rowH = 0; }
    it.fx = x; it.fy = y; it.fw = fw; it.fh = fh;
    delete it.w; delete it.h;
    x += fw; rowH = Math.max(rowH, fh);
  });
  // всё должно влезать в зону без прокрутки — ужмём по вертикали при переполнении
  const bottom = Math.max(...list.map((it) => it.fy + it.fh));
  if (bottom > 1) list.forEach((it) => { it.fy /= bottom; it.fh /= bottom; });
}

// миграция со старых версий (плоская сетка tree -> доска board)
function migrate(s) {
  if (!s || !s.settings || (!Array.isArray(s.board) && !Array.isArray(s.tree))) return defaultState();
  s.settings.bg = s.settings.bg || { mode: 'curated', blur: 3, dim: 35, intervalMin: 30, index: 0, lastChange: 0, customUrls: [], upload: '', color: PRESETS[0] };
  delete s.settings.searchEngine;
  if (!s.settings.lang) s.settings.lang = 'auto';
  if (!Array.isArray(s.board)) {
    s.board = (s.tree || []).map(toWidget);
    delete s.tree;
  }
  if (typeof s.geo !== 'object' || !s.geo) s.geo = {};
  if (s.board.length && s.board.some((w) => w.fx === undefined)) flowLayout(s.board);
  s.board.forEach((w) => {
    const d = DEF_RECT[w.type] || DEF_RECT.link;
    if (!w.id) w.id = uid();
    if (typeof w.fx !== 'number' || isNaN(w.fx)) w.fx = 0.02;
    if (typeof w.fy !== 'number' || isNaN(w.fy)) w.fy = 0.02;
    if (typeof w.fw !== 'number' || isNaN(w.fw)) w.fw = d.fw;
    if (typeof w.fh !== 'number' || isNaN(w.fh)) w.fh = d.fh;
    delete w.w; delete w.h;
    if (w.type === 'folder' && !Array.isArray(w.children)) w.children = [];
    if (w.type === 'currency') {
      if (!w.base) w.base = 'UAH';
      if (!Array.isArray(w.symbols) || !w.symbols.length) w.symbols = ['USD', 'EUR'];
    }
    if (w.type === 'forecast') { w.type = 'weather'; w.showCurrent = true; w.days = 3; w.hours = 0; }
    if (w.type === 'weather') {
      if (w.showCurrent === undefined) w.showCurrent = true;
      if (typeof w.days !== 'number') w.days = 0;
      if (typeof w.hours !== 'number') w.hours = 0;
    }
    if (w.type === 'crypto' && !Array.isArray(w.coins)) w.coins = ['BTC', 'ETH'];
  });
  return s;
}

const store = {
  hasSync: typeof browser !== 'undefined' && browser.storage?.sync,
  async load() {
    try {
      if (this.hasSync) {
        const r = await browser.storage.sync.get('state');
        if (r.state) return migrate(r.state);
      }
    } catch {}
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch {}
    return defaultState();
  },
  async save(st) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch {}
    try {
      if (this.hasSync) await browser.storage.sync.set({ state: st });
      else if (typeof chrome !== 'undefined' && chrome.storage?.sync) chrome.storage.sync.set({ state: st });
    } catch {}
  },
};

let state = defaultState();
let path = []; // стек id открытых папок; пусто = доска
let wEditing = null;
let draggedId = null;
let bgTimer = null;
let showingA = true;
const isEdit = () => document.body.dataset.edit === '1';

// ---------- дерево (корень — доска) ----------
function getFolderByPath() {
  let list = state.board, cur = null;
  for (const id of path) {
    cur = list.find((i) => i.id === id && i.type === 'folder');
    if (!cur) return { list: state.board, folder: null };
    list = cur.children;
  }
  return { list, folder: cur };
}
function findItem(id, list = state.board, parent = null) {
  for (const it of list) {
    if (it.id === id) return { item: it, parent: parent || { children: state.board }, list };
    if (it.type === 'folder' && Array.isArray(it.children)) {
      const r = findItem(id, it.children, it);
      if (r) return r;
    }
  }
  return null;
}
function isDescendant(folderId, maybeChildId) {
  const f = findItem(folderId);
  if (!f) return false;
  const walk = (n) => n.id === maybeChildId || (n.type === 'folder' && (n.children || []).some(walk));
  return walk(f.item);
}
function findTrail(id, list = state.board, trail = []) {
  for (const it of list) {
    if (it.id === id) return trail;
    if (it.type === 'folder' && it.children) {
      const r = findTrail(id, it.children, [...trail, it.id]);
      if (r) return r;
    }
  }
  return null;
}
function parseSyms(s) {
  return (s || '').toUpperCase().split(/[^A-Z]+/).filter((x) => /^[A-Z]{3}$/.test(x)).slice(0, 6);
}
function prettyHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}
// название страницы по URL: сначала microlink (любой сайт), потом noembed (oEmbed)
async function fetchTitle(url, signal) {
  try {
    const r = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`, { signal });
    const j = await r.json();
    if (j && j.data && j.data.title) return String(j.data.title).trim();
  } catch {}
  try {
    const r = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, { signal });
    const j = await r.json();
    if (j && j.title) return String(j.title).trim();
  } catch {}
  return '';
}
function normalizeUrl(u) {
  u = (u || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}
function favicon(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; }
  catch { return ''; }
}
// автоиконки как в Heimdall: узнал приложение по названию/хосту — тянем
// красивую иконку из dashboard-icons, иначе обычный favicon, иначе буква
const ICON_ALIASES = {
  proxmox: 'proxmox', proxmoxve: 'proxmox', pve: 'proxmox',
  pihole: 'pihole', adguardhome: 'adguardhome', adguard: 'adguardhome',
  unraid: 'unraid', truenas: 'truenas', truenascore: 'truenas', truenasscale: 'truenas',
  synology: 'synology', qnap: 'qnap',
  docker: 'docker', portainer: 'portainer', dockge: 'dockge',
  homeassistant: 'homeassistant', hass: 'homeassistant', hassio: 'homeassistant',
  esphome: 'esphome', zigbee2mqtt: 'zigbee2mqtt', nodered: 'node-red',
  jellyfin: 'jellyfin', plex: 'plex', emby: 'emby', navidrome: 'navidrome',
  audiobookshelf: 'audiobookshelf', kavita: 'kavita', calibre: 'calibre',
  sonarr: 'sonarr', radarr: 'radarr', lidarr: 'lidarr', readarr: 'readarr',
  prowlarr: 'prowlarr', bazarr: 'bazarr', overseerr: 'overseerr', overseer: 'overseerr',
  jellyseerr: 'jellyseerr', jellyseer: 'jellyseerr', tautulli: 'tautulli', tdarr: 'tdarr',
  qbittorrent: 'qbittorrent', qbit: 'qbittorrent', transmission: 'transmission',
  deluge: 'deluge', sabnzbd: 'sabnzbd', sab: 'sabnzbd', nzbget: 'nzbget', jackett: 'jackett',
  grafana: 'grafana', uptimekuma: 'uptime-kuma', uptime: 'uptime-kuma', healthchecks: 'healthchecks',
  netdata: 'netdata', scrutiny: 'scrutiny',
  traefik: 'traefik', nginxproxymanager: 'nginx-proxy-manager',
  vaultwarden: 'vaultwarden', bitwarden: 'bitwarden', authentik: 'authentik', authelia: 'authelia',
  nextcloud: 'nextcloud', immich: 'immich', photoprism: 'photoprism',
  paperless: 'paperless-ngx', paperlessngx: 'paperless-ngx',
  filebrowser: 'filebrowser', syncthing: 'syncthing', duplicati: 'duplicati',
  gitea: 'gitea', gitlab: 'gitlab', github: 'github', mineos: 'mineos',
  mealie: 'mealie', freshrss: 'freshrss', vikunja: 'vikunja',
  heimdall: 'heimdall', homarr: 'homarr', dashy: 'dashy', homepage: 'homepage', flame: 'flame',
  wireguard: 'wireguard', wgeasy: 'wg-easy', tailscale: 'tailscale',
  dozzle: 'dozzle', watchtower: 'watchtower', changedetection: 'changedetection-io',
  frigate: 'frigate',
  youtube: 'youtube', gmail: 'gmail', discord: 'discord', telegram: 'telegram',
  reddit: 'reddit', spotify: 'spotify', netflix: 'netflix', twitch: 'twitch',
  steam: 'steam', notion: 'notion', google: 'google', stackoverflow: 'stackoverflow',
};
function iconCandidates(title, url) {
  const out = [];
  const seen = new Set();
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const push = (n) => {
    const base = ICON_ALIASES[n];
    if (base && !seen.has(base)) {
      seen.add(base);
      out.push(`https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/${base}.svg`);
      out.push(`https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${base}.png`);
    }
  };
  if (title) push(norm(title));
  try {
    new URL(url).hostname.toLowerCase().split('.').forEach((p) => { if (p && p !== 'www') push(norm(p)); });
  } catch {}
  const fav = favicon(url);
  if (fav) out.push(fav);
  return out;
}
function appendIconImg(box, link, cls) {
  const urls = iconCandidates(link.title, link.url);
  if (!urls.length) return;
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = '';
  img.draggable = false;
  if (cls) img.className = cls;
  let i = 0;
  img.onerror = () => { i++; if (i < urls.length) img.src = urls[i]; else img.remove(); };
  img.src = urls[0];
  box.appendChild(img);
}
function firstLetter(title) {
  const t = (title || '?').trim();
  return (t[0] || '?').toUpperCase();
}
// размеры теперь свободные (fx/fy/fw/fh от размера зоны), см. placeEl

// ---------- ФОН ----------
function bgList() {
  const b = state.settings.bg;
  if (b.mode === 'custom') {
    const urls = (b.customUrls || []).map((s) => s.trim()).filter(Boolean);
    return urls.length ? urls : CURATED;
  }
  if (b.mode === 'upload') return b.upload ? [b.upload] : CURATED;
  return CURATED;
}
function applyFilters() {
  const { blur, dim } = state.settings.bg;
  document.querySelectorAll('.bg').forEach((el) => { el.style.filter = blur > 0 ? `blur(${blur}px) scale(1.06)` : 'none'; });
  $('#dim').style.opacity = (dim / 100).toFixed(2);
}
function paintBg(urlOrCss, isImage) {
  const show = showingA ? $('#bgB') : $('#bgA');
  const hide = showingA ? $('#bgA') : $('#bgB');
  if (isImage) {
    const img = new Image();
    img.onload = () => {
      show.style.backgroundImage = `url("${urlOrCss}")`;
      show.style.backgroundColor = 'transparent';
      show.hidden = false; show.style.opacity = 1;
      hide.style.opacity = 0;
      setTimeout(() => { hide.hidden = true; }, 850);
      showingA = !showingA;
    };
    img.onerror = () => {};
    img.src = urlOrCss;
  } else {
    show.style.backgroundImage = 'none';
    show.style.background = urlOrCss;
    show.hidden = false; show.style.opacity = 1;
    hide.style.opacity = 0;
    setTimeout(() => { hide.hidden = true; }, 850);
    showingA = !showingA;
  }
  applyFilters();
}
function currentBgTarget() {
  const b = state.settings.bg;
  if (b.mode === 'gradient' || b.mode === 'color') return { css: b.color, isImage: false };
  const list = bgList();
  b.index = ((b.index % list.length) + list.length) % list.length;
  return { css: list[b.index], isImage: true };
}
function showBg() {
  const bg = currentBgTarget();
  paintBg(bg.css, bg.isImage);
  const b = state.settings.bg;
  $('#credit').innerHTML = (b.mode === 'curated' || (b.mode === 'custom' && !b.customUrls.length && !b.upload))
    ? `${t('photo')} <a href="https://unsplash.com" target="_blank">Unsplash</a>` : '';
  if (bg.isImage) {
    const list = bgList();
    const nx = list[(b.index + 1) % list.length];
    if (nx) { const i = new Image(); i.src = nx; }
  }
}
function nextBg(step = 1) {
  const b = state.settings.bg;
  if (b.mode === 'gradient' || b.mode === 'color') return;
  b.index += step;
  b.lastChange = Date.now();
  store.save(state);
  showBg();
}
function scheduleBg() {
  clearInterval(bgTimer);
  const b = state.settings.bg;
  const need = b.intervalMin === 0
    ? true
    : (Date.now() - (b.lastChange || 0)) > b.intervalMin * 60000;
  if ((b.mode === 'curated' || b.mode === 'custom') && need && b.lastChange !== 0) b.index++;
  if ((b.mode === 'curated' || b.mode === 'custom') && b.intervalMin > 0) {
    bgTimer = setInterval(() => nextBg(1), b.intervalMin * 60000);
  }
  b.lastChange = b.lastChange || Date.now();
}

function fileToDataUrl(file, maxDim = 1920) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        const k = Math.min(1, maxDim / Math.max(w, h));
        w = Math.round(w * k); h = Math.round(h * k);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = rej;
      img.src = r.result;
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ---------- иконки ----------
function buildPreview(iconBox, folder) {
  iconBox.innerHTML = '';
  const kids = (folder.children || []).slice(0, 4);
  for (let i = 0; i < 4; i++) {
    const cell = document.createElement('span');
    cell.className = 'pv';
    const k = kids[i];
    if (k) {
      if (k.type === 'folder') {
        cell.textContent = '📁';
      } else {
        const letter = document.createElement('span');
        letter.className = 'pv-letter';
        letter.textContent = firstLetter(k.title);
        cell.appendChild(letter);
        appendIconImg(cell, k);
      }
    }
    iconBox.appendChild(cell);
  }
}

function buildLinkIcon(iconBox, link) {
  iconBox.innerHTML = '';
  const letter = document.createElement('span');
  letter.className = 'link-letter';
  letter.textContent = firstLetter(link.title);
  iconBox.appendChild(letter);
  appendIconImg(iconBox, link, 'link-fav');
}

function buildChecklist(el, w) {
  if (!Array.isArray(w.items)) w.items = [];
  const head = document.createElement('div');
  head.className = 'w-note-head';
  const tt = document.createElement('span');
  tt.textContent = w.title || t('tChecklist');
  head.appendChild(tt);
  head.appendChild(widgetMini(() => openWModal('edit', w), () => delWidget(w.id)));
  const list = document.createElement('div');
  list.className = 'w-check-list';
  const paintItem = (item) => {
    const li = document.createElement('label');
    li.className = 'w-check-item' + (item.done ? ' done' : '');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!item.done;
    cb.onchange = () => { item.done = cb.checked; li.classList.toggle('done', item.done); quietSave(); };
    const tx = document.createElement('span');
    tx.textContent = item.text;
    tx.title = item.text;
    const del = document.createElement('button');
    del.className = 'del';
    del.type = 'button';
    del.textContent = '✕';
    del.title = t('remove');
    del.onclick = (e) => { e.preventDefault(); w.items.splice(w.items.indexOf(item), 1); li.remove(); quietSave(); };
    li.append(cb, tx, del);
    return li;
  };
  w.items.forEach((item) => list.appendChild(paintItem(item)));
  const form = document.createElement('form');
  form.className = 'w-check-add';
  const inp = document.createElement('input');
  inp.placeholder = t('newItem');
  inp.maxLength = 120;
  const add = document.createElement('button');
  add.type = 'submit';
  add.textContent = '+';
  add.title = t('add');
  form.onsubmit = (e) => {
    e.preventDefault();
    const v = inp.value.trim();
    if (!v) return;
    const item = { id: uid(), text: v };
    w.items.push(item);
    list.appendChild(paintItem(item));
    list.scrollTop = list.scrollHeight;
    inp.value = '';
    inp.focus();
    quietSave();
  };
  form.append(inp, add);
  el.append(head, list, form);
}

function widgetMini(onEdit, onDel) {
  const mini = document.createElement('div');
  mini.className = 'mini';
  if (onEdit) {
    const bEdit = document.createElement('button');
    bEdit.textContent = '✎';
    bEdit.title = t('editTip');
    bEdit.onclick = (e) => { e.stopPropagation(); onEdit(); };
    mini.append(bEdit);
  }
  const bDel = document.createElement('button');
  bDel.textContent = '✕';
  bDel.title = t('delTip');
  bDel.onclick = (e) => { e.stopPropagation(); onDel(); };
  mini.append(bDel);
  return mini;
}

// ---------- виджеты доски ----------
function placeEl(el, w) {
  el.style.left = (w.fx * 100) + '%';
  el.style.top = (w.fy * 100) + '%';
  el.style.width = (w.fw * 100) + '%';
  el.style.height = (w.fh * 100) + '%';
}

// мини-ссылка внутри папки OnePlus (кликабельна без открытия)
function inlineMini(k) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'w-mini';
  b.title = k.title || '';
  const ic = document.createElement('span');
  ic.className = 'mi';
  if (k.type === 'folder') {
    ic.textContent = '📁';
  } else {
    const lt = document.createElement('span');
    lt.textContent = firstLetter(k.title);
    ic.appendChild(lt);
    appendIconImg(ic, k);
  }
  const nm = document.createElement('span');
  nm.className = 'mn';
  nm.textContent = k.title || '';
  b.append(ic, nm);
  b.onclick = (e) => {
    e.stopPropagation();
    if (isEdit()) return;
    if (k.type === 'link') window.open(k.url, '_blank');
    else {
      const tr = findTrail(k.id);
      if (tr) { path = [...tr, k.id]; render(); }
    }
  };
  return b;
}

function widgetEl(w) {
  const el = document.createElement('div');
  el.className = `widget w-${w.type}`;
  el.dataset.wid = w.id;
  placeEl(el, w);

  if (w.type === 'note') {
    const head = document.createElement('div');
    head.className = 'w-note-head';
    const tt = document.createElement('span');
    tt.textContent = w.title || t('tNote');
    head.appendChild(tt);
    head.appendChild(widgetMini(() => openWModal('edit', w), () => delWidget(w.id)));
    const ta = document.createElement('textarea');
    ta.className = 'w-note-text';
    ta.value = w.text || '';
    ta.placeholder = t('writePh');
    ta.addEventListener('input', () => { w.text = ta.value; quietSave(); });
    ta.addEventListener('blur', () => store.save(state));
    el.append(head, ta);
  } else if (w.type === 'weather') {
    // один гибкий виджет: текущая + часы + дни — что включено в настройках
    if (w.showCurrent !== false) {
      const ic = document.createElement('div');
      ic.className = 'w-wicon';
      ic.textContent = '🌡';
      const tp = document.createElement('div');
      tp.className = 'w-wtemp';
      tp.textContent = '…';
      const ct = document.createElement('div');
      ct.className = 'w-wcity';
      ct.textContent = w.city || '';
      el.append(ic, tp, ct);
    }
    const hrs = document.createElement('div');
    hrs.className = 'w-hours';
    const rows = document.createElement('div');
    rows.className = 'w-rows';
    el.append(hrs, rows);
    if (w.showCurrent === false && !(+w.days > 0) && !(+w.hours > 0)) {
      const hint = document.createElement('div');
      hint.className = 'w-wcity';
      hint.textContent = t('setupHint');
      el.appendChild(hint);
    }
    el.appendChild(widgetMini(() => openWModal('edit', w), () => delWidget(w.id)));
    el.title = t('tWeather') + ': ' + (w.city || '');
  } else if (w.type === 'currency') {
    const rows = document.createElement('div');
    rows.className = 'w-rows';
    el.append(rows);
    el.title = t('tCurrency');
    el.appendChild(widgetMini(() => openWModal('edit', w), () => delWidget(w.id)));
  } else if (w.type === 'crypto') {
    const rows = document.createElement('div');
    rows.className = 'w-rows';
    el.append(rows);
    el.title = 'CoinGecko';
    el.appendChild(widgetMini(() => openWModal('edit', w), () => delWidget(w.id)));
  } else if (w.type === 'quote') {
    const q = document.createElement('div');
    q.className = 'w-quote';
    const a = document.createElement('div');
    a.className = 'w-quote-a';
    paintQuote(w, q, a);
    const sh = document.createElement('button');
    sh.className = 'w-shuffle';
    sh.type = 'button';
    sh.textContent = '⟳';
    sh.title = t('quoteAnother');
    sh.onclick = (e) => { e.stopPropagation(); w.qoff = (w.qoff || 0) + 1; paintQuote(w, q, a); quietSave(); };
    el.append(q, a, sh);
    el.appendChild(widgetMini(null, () => delWidget(w.id)));
  } else if (w.type === 'link') {
    const icon = document.createElement('div');
    icon.className = 'w-icon';
    buildLinkIcon(icon, w);
    const name = document.createElement('div');
    name.className = 'w-name';
    name.textContent = w.title;
    el.append(icon, name);
    el.title = w.url || '';
    el.onclick = (e) => {
      if (el.dataset.noclick) return;
      if (e.target.closest('.mini') || e.target.closest('.rz')) return;
      if (isEdit()) return; // в режиме ✎ клики отключены, чтобы спокойно расставлять
      window.open(w.url, '_blank');
    };
    el.appendChild(widgetMini(() => openWModal('edit', w), () => delWidget(w.id)));
  } else {
    // папка OnePlus: ссылки прямо внутри, остаток — в кнопку +N
    const kids = w.children || [];
    const name = document.createElement('div');
    name.className = 'w-name';
    name.textContent = w.title;
    const box = document.createElement('div');
    box.className = 'w-inline';
    const zr = $('#grid').getBoundingClientRect();
    const cols = Math.max(1, Math.floor(((w.fw * zr.width) - 16) / 52));
    const rows = Math.max(1, Math.floor(((w.fh * zr.height) - 70) / 52));
    const cap = Math.max(1, cols * rows);
    if (!kids.length) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'w-mini';
      const ic = document.createElement('span');
      ic.className = 'mi';
      ic.textContent = '📁';
      const nm = document.createElement('span');
      nm.className = 'mn';
      nm.textContent = t('emptyList');
  b.append(ic, nm);
  b.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (k.type === 'link') openCtx(e.clientX, e.clientY, ctxItemsLink(k, true));
    else openCtx(e.clientX, e.clientY, ctxItemsFolder(k, true, () => { const tr = findTrail(k.id); if (tr) { path = [...tr, k.id]; render(); } }));
  });
      b.onclick = (e) => { e.stopPropagation(); if (isEdit()) return; path = [w.id]; render(); };
      box.appendChild(b);
    } else {
      const show = kids.length > cap ? cap - 1 : kids.length;
      kids.slice(0, show).forEach((k) => box.appendChild(inlineMini(k)));
      if (kids.length > cap) {
        const over = kids.length - show;
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'w-mini w-more';
        more.title = t('mOpen');
        const ic = document.createElement('span');
        ic.className = 'mi';
        ic.textContent = '+' + over;
        const nm = document.createElement('span');
        nm.className = 'mn';
        nm.textContent = t('all');
        more.append(ic, nm);
        more.onclick = (e) => { e.stopPropagation(); if (isEdit()) return; path = [w.id]; render(); };
        box.appendChild(more);
      }
    }
    el.append(name, box);
    el.onclick = (e) => {
      if (el.dataset.noclick) return;
      if (e.target.closest('.mini') || e.target.closest('.rz')) return;
      if (isEdit()) return;
      path = [w.id];
      render();
    };
    el.appendChild(widgetMini(() => openWModal('edit', w), () => delWidget(w.id)));
  }

  // ручка ресайза
  const rz = document.createElement('div');
  rz.className = 'rz';
  rz.title = t('resize');
  el.appendChild(rz);
  initResize(rz, el, w);

  // свободное перемещение в режиме ✎ (pointer events: мышь + тач)
  initFreeDrag(el, w);

  // правая кнопка (в полях ввода — системное меню для вставки)
  el.addEventListener('contextmenu', (e) => {
    if (e.target.closest('textarea,input')) return;
    e.preventDefault();
    e.stopPropagation();
    if (w.type === 'link') openCtx(e.clientX, e.clientY, ctxItemsLink(w, false));
    else if (w.type === 'folder') openCtx(e.clientX, e.clientY, ctxItemsFolder(w, false, () => { path = [w.id]; render(); }));
    else openCtx(e.clientX, e.clientY, ctxItemsWidget(w));
  });
  return el;
}

function delWidget(id) {
  const w = state.board.find((x) => x.id === id);
  if (!w) return;
  if (w.type === 'folder' && w.children.length && !confirm(t('delFolder', w.title, w.children.length))) return;
  if (w.type !== 'folder' && !confirm(t('delOne', w.title || t('untitled')))) return;
  state.board.splice(state.board.findIndex((x) => x.id === id), 1);
  path = path.filter((pid) => findItem(pid));
  save();
}

// свободное перемещение виджета — работает и в обычном режиме;
// ссылку/папку можно бросить на папку — переедет внутрь
function initFreeDrag(el, w) {
  const canContain = w.type === 'link' || w.type === 'folder';
  let pendingHi = null;
  const clearHi = () => { if (pendingHi) { pendingHi.classList.remove('drop-target'); pendingHi = null; } };
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('textarea,input,button,a,.rz,.mini')) return;
    e.preventDefault();
    const zone = $('#grid');
    const zr = zone.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const ox = w.fx * zr.width, oy = w.fy * zr.height;
    let moved = false;
    try { el.setPointerCapture(e.pointerId); } catch {}
    const move = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      el.classList.add('dragging');
      el.style.pointerEvents = 'none'; // чтобы elementFromPoint видел папку под виджетом
      const ew = el.offsetWidth, eh = el.offsetHeight;
      const nx = clamp(ox + dx, 0, Math.max(0, zr.width - ew));
      const ny = clamp(oy + dy, 0, Math.max(0, zr.height - eh));
      // запрет налезания друг на друга: целиком, иначе скользим вдоль стороны
      const cur = { x: el.offsetLeft, y: el.offsetTop, w: ew, h: eh };
      if (!hitsAny({ ...cur, x: nx, y: ny }, w.id)) { cur.x = nx; cur.y = ny; }
      else if (!hitsAny({ ...cur, x: nx }, w.id)) cur.x = nx;
      else if (!hitsAny({ ...cur, y: ny }, w.id)) cur.y = ny;
      el.style.left = cur.x + 'px';
      el.style.top = cur.y + 'px';
      clearHi();
      if (canContain) {
        const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.widget.w-folder');
        if (t && t.dataset.wid !== w.id) { t.classList.add('drop-target'); pendingHi = t; }
      }
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.style.pointerEvents = '';
      el.classList.remove('dragging');
      const target = pendingHi;
      clearHi();
      if (!moved) return;
      el.dataset.noclick = '1'; // клик после перетаскивания не открывать
      setTimeout(() => delete el.dataset.noclick, 60);
      if (target && canContain && moveIntoFolder(w.id, target.dataset.wid)) return;
      if (target && canContain) { save(); return; } // невалидная цель — вернуть на место
      const zr2 = zone.getBoundingClientRect();
      if (zr2.width > 0) w.fx = clamp(el.offsetLeft / zr2.width, 0, 1);
      if (zr2.height > 0) w.fy = clamp(el.offsetTop / zr2.height, 0, 1);
      save();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
}

function initResize(handle, el, w) {
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const zone = $('#grid');
    const zr = zone.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const sw = el.offsetWidth, sh = el.offsetHeight;
    const mm = MIN_PX[w.type] || [90, 90];
    try { handle.setPointerCapture(e.pointerId); } catch {}
    const move = (ev) => {
      const nw = clamp(sw + ev.clientX - startX, mm[0], Math.max(mm[0], zr.width - el.offsetLeft));
      const nh = clamp(sh + ev.clientY - startY, mm[1], Math.max(mm[1], zr.height - el.offsetTop));
      // размер, не налезающий на соседей
      if (hitsAny({ x: el.offsetLeft, y: el.offsetTop, w: nw, h: nh }, w.id)) return;
      el.style.width = nw + 'px';
      el.style.height = nh + 'px';
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      const zr2 = zone.getBoundingClientRect();
      if (zr2.width > 0) w.fw = clamp(el.offsetWidth / zr2.width, 0.05, 1);
      if (zr2.height > 0) w.fh = clamp(el.offsetHeight / zr2.height, 0.05, 1);
      save();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });
}

// тихая запись без перерендера (текст заметок)
let noteT = null;
function quietSave() {
  clearTimeout(noteT);
  noteT = setTimeout(() => store.save(state), 600);
}

// ---------- плитка внутри окна папки (классика) ----------
function tileEl(it) {
  const el = document.createElement('div');
  el.className = 'tile' + (it.type === 'folder' ? ' folder' : '');
  el.draggable = true;
  el.dataset.id = it.id;

  const icon = document.createElement('div');
  icon.className = 'icon';
  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = it.title;
  const mini = document.createElement('div');
  mini.className = 'mini';
  const bEdit = document.createElement('button');
  bEdit.textContent = '✎';
  bEdit.onclick = () => openWModal('edit', it);
  const bDel = document.createElement('button');
  bDel.textContent = '✕';
  bDel.onclick = () => {
    if (!confirm(t('delOne', it.title))) return;
    const found = findItem(it.id);
    if (!found) return;
    found.parent.children.splice(found.parent.children.findIndex((x) => x.id === it.id), 1);
    path = path.filter((pid) => findItem(pid));
    save();
  };
  mini.append(bEdit, bDel);
  const _loc = findItem(it.id);
  if (_loc && _loc.parent.children !== state.board) {
    const bTop = document.createElement('button');
    bTop.textContent = '⤴';
    bTop.title = t('toBoardTip');
    bTop.onclick = () => moveToBoard(it.id);
    mini.append(bTop);
  }

  if (it.type === 'folder') {
    icon.classList.add('preview');
    buildPreview(icon, it);
    const count = document.createElement('div');
    count.className = 'count';
    count.textContent = it.children.length ? String(it.children.length) : '';
    el.append(icon, name, count, mini);
    el.onclick = (e) => {
      if (e.target.closest('.mini')) return;
      path.push(it.id);
      render();
    };
  } else {
    buildLinkIcon(icon, it);
    el.append(icon, name, mini);
    el.title = it.url;
    el.onclick = (e) => { if (!e.target.closest('.mini')) window.open(it.url, '_blank'); };
  }

  el.addEventListener('dragstart', (e) => { draggedId = it.id; document.body.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag-over'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.remove('drag-over'); moveItem(draggedId, it.id); });
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const loc = findItem(it.id);
    const nested = loc && loc.parent.children !== state.board;
    if (it.type === 'link') openCtx(e.clientX, e.clientY, ctxItemsLink(it, nested));
    else openCtx(e.clientX, e.clientY, ctxItemsFolder(it, nested, () => { path.push(it.id); render(); }));
  });
  return el;
}

function moveItem(dragId, targetId) {
  if (!dragId || dragId === targetId) return;
  const d = findItem(dragId), t = findItem(targetId);
  if (!d || !t) return;
  if (d.item.type !== 'link' && d.item.type !== 'folder') return alert(t('onlyBoard'));
  if (t.item.type === 'folder') {
    if (d.item.type === 'folder' && (dragId === targetId || isDescendant(dragId, targetId))) return alert(t('selfNest'));
    d.parent.children.splice(d.parent.children.findIndex((x) => x.id === dragId), 1);
    t.item.children.push(d.item);
  } else if (d.parent !== t.parent) {
    d.parent.children.splice(d.parent.children.findIndex((x) => x.id === dragId), 1);
    t.parent.children.splice(t.parent.children.findIndex((x) => x.id === targetId), 0, d.item);
  } else {
    const arr = d.parent.children;
    const [m] = arr.splice(arr.findIndex((x) => x.id === dragId), 1);
    arr.splice(arr.findIndex((x) => x.id === targetId), 0, m);
  }
  save();
}

// вынести элемент из папки на доску (drag из окна невозможен — окно перекрывает доску)
function moveToBoard(id) {
  if (!id) return;
  const f = findItem(id);
  if (!f || f.parent.children === state.board) return;
  if (f.item.type !== 'link' && f.item.type !== 'folder') return;
  f.parent.children.splice(f.parent.children.findIndex((x) => x.id === id), 1);
  placeOnBoard(f.item);
  state.board.push(f.item);
  save();
}

// перетащить ссылку/папку на доске в папку
function moveIntoFolder(dragId, targetId) {
  if (!dragId || dragId === targetId) return false;
  const d = findItem(dragId), t = findItem(targetId);
  if (!d || !t || t.item.type !== 'folder') return false;
  if (d.item.type !== 'link' && d.item.type !== 'folder') return false;
  if (d.item.type === 'folder' && isDescendant(dragId, targetId)) {
    alert(t('selfNest'));
    save();
    return true;
  }
  d.parent.children.splice(d.parent.children.findIndex((x) => x.id === dragId), 1);
  delete d.item.fx; delete d.item.fy; delete d.item.fw; delete d.item.fh;
  t.item.children.push(d.item);
  path = path.filter((pid) => findItem(pid));
  save();
  return true;
}
async function save() { await store.save(state); render(); }

// ---------- погода (Open-Meteo, без ключа) ----------
const wxMem = {};
function wmoIcon(c) {
  if (c === 0) return '☀';
  if (c <= 2) return '⛅';
  if (c === 3) return '☁';
  if (c <= 48) return '🌫';
  if (c <= 57) return '🌦';
  if (c <= 67) return '🌧';
  if (c <= 77) return '🌨';
  if (c <= 82) return '🌦';
  if (c <= 86) return '🌨';
  return '⛈';
}
async function resolveCity(city) {
  const key = city.trim().toLowerCase();
  const g = state.geo[key];
  if (g && (Date.now() - g.ts) < 30 * 864e5) return g;
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${lang() === 'ru' ? 'ru' : 'en'}&format=json`);
  const j = await r.json();
  if (!j.results || !j.results.length) throw new Error('no city');
  const v = { lat: j.results[0].latitude, lon: j.results[0].longitude, name: j.results[0].name, ts: Date.now() };
  state.geo[key] = v;
  store.save(state);
  return v;
}
async function loadWeather(w) {
  const root = document.querySelector(`[data-wid="${w.id}"]`);
  if (!root) return;
  const showCur = w.showCurrent !== false;
  const days = Math.min(7, Math.max(0, +w.days || 0));
  const nH = Math.max(0, Math.round((+w.hours || 0) / 3));
  const tEl = root.querySelector('.w-wtemp');
  const iEl = root.querySelector('.w-wicon');
  const cEl = root.querySelector('.w-wcity');
  const hrs = root.querySelector('.w-hours');
  const box = root.querySelector('.w-rows');
  try {
    if (!w.city || !w.city.trim()) {
      if (tEl) tEl.textContent = '—';
      if (cEl)       if (cEl) cEl.textContent = isEdit() ? t('setCity') : t('noCity');
      return;
    }
    let mem = wxMem[w.id];
    if (!mem || Date.now() - mem.t > 30 * 60e3 || mem.city !== w.city) {
      const g = await resolveCity(w.city);
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=8`);
      const j = await r.json();
      mem = wxMem[w.id] = { t: Date.now(), city: w.city, name: g.name, j };
    }
    const { j, name } = mem;
    if (showCur && tEl) {
      tEl.textContent = `${Math.round(j.current.temperature_2m)}°`;
      iEl.textContent = wmoIcon(j.current.weather_code);
      cEl.textContent = name;
    } else if (cEl && (nH || days)) {
      cEl.textContent = name;
    }
    if (hrs) {
      hrs.innerHTML = '';
      if (nH > 0) {
        const curH = j.current.time.slice(0, 13);
        let si = j.hourly.time.findIndex((t) => t.slice(0, 13) >= curH);
        if (si < 0) si = 0;
        for (let k = 0; k < nH; k++) {
          const i = si + k * 3;
          if (i >= j.hourly.time.length) break;
          const d = document.createElement('div');
          d.className = 'w-hour';
          const hh = document.createElement('span');
          hh.className = 'hh';
          hh.textContent = j.hourly.time[i].slice(11, 16);
          const ii = document.createElement('span');
          ii.textContent = wmoIcon(j.hourly.weather_code[i]);
          const vv = document.createElement('span');
          vv.className = 'hv';
          vv.textContent = `${Math.round(j.hourly.temperature_2m[i])}°`;
          d.append(hh, ii, vv);
          hrs.appendChild(d);
        }
      }
    }
    if (box) {
      box.innerHTML = '';
      const start = showCur ? 1 : 0;
      for (let k = 0; k < days; k++) {
        const i = start + k;
        if (i >= j.daily.time.length) break;
        const day = new Date(j.daily.time[i] + 'T12:00:00').toLocaleDateString(loc(), { weekday: 'short' });
        const row = document.createElement('div');
        row.className = 'w-row';
        const dEl = document.createElement('span');
        dEl.className = 'd';
        dEl.textContent = day;
        const ic = document.createElement('span');
        ic.textContent = wmoIcon(j.daily.weather_code[i]);
        const v = document.createElement('span');
        v.className = 'v';
        v.textContent = `${Math.round(j.daily.temperature_2m_max[i])}° / ${Math.round(j.daily.temperature_2m_min[i])}°`;
        row.append(dEl, ic, v);
        box.appendChild(row);
      }
    }
  } catch {
    if (tEl) tEl.textContent = '—';
  }
}
const QUOTES = [
  ['Мы — то, что мы делаем постоянно. Совершенство — не действие, а привычка.', 'Аристотель'],
  ['Начни там, где ты находишься. Используй то, что у тебя есть.', 'Артур Эш'],
  ['Успех — это идти от неудачи к неудаче, не теряя энтузиазма.', 'У. Черчилль'],
  ['Все, что ты можешь вообразить, — реально.', 'П. Пикассо'],
  ['Лучшее время посадить дерево — двадцать лет назад. Второе лучшее — сейчас.', 'Пословица'],
  ['Не откладывай на завтра то, что можно сделать сегодня.', 'Б. Франклин'],
  ['Простота — залог надежности.', 'Э. Дейкстра'],
  ['Сначала реши задачу. Затем напиши код.', 'Дж. Джонсон'],
  ['Знание — сила.', 'Ф. Бэкон'],
  ['Дорогу осилит идущий.', 'Пословица'],
  ['Меньше, но лучше.', 'Дитер Рамс'],
  ['Сделанное лучше идеального.', 'Принцип'],
  ['Порядок освобождает мысль.', 'Принцип'],
  ['Делай сегодня то, что другие не хотят, и завтра будешь жить так, как другие не могут.', 'Принцип'],
  ['Единственный способ делать великие дела — любить то, что ты делаешь.', 'С. Джобс'],
  ['Действие — ключ к успеху.', 'П. Пикассо'],
];
const QUOTES_EN = [
  ['We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'Aristotle'],
  ['Start where you are. Use what you have.', 'A. Ashe'],
  ['Success is going from failure to failure without losing enthusiasm.', 'W. Churchill'],
  ['Everything you can imagine is real.', 'P. Picasso'],
  ['The best time to plant a tree was 20 years ago. The second best time is now.', 'Proverb'],
  ['Never put off till tomorrow what you can do today.', 'B. Franklin'],
  ['Simplicity is prerequisite for reliability.', 'E. Dijkstra'],
  ['First, solve the problem. Then, write the code.', 'J. Johnson'],
  ['Knowledge is power.', 'F. Bacon'],
  ['Less, but better.', 'Dieter Rams'],
  ['Done is better than perfect.', 'Principle'],
  ['The only way to do great work is to love what you do.', 'S. Jobs'],
  ['Action is the foundational key to all success.', 'P. Picasso'],
  ['It always seems impossible until it is done.', 'N. Mandela'],
  ['What we think, we become.', 'Buddha'],
  ['Well begun is half done.', 'Proverb'],
];
function paintQuote(w, qEl, aEl) {
  const arr = lang() === 'ru' ? QUOTES : QUOTES_EN;
  const i = (Math.floor(Date.now() / 864e5) + (w.qoff || 0)) % arr.length;
  const q = arr[(i + arr.length) % arr.length];
  qEl.textContent = lang() === 'ru' ? '«' + q[0] + '»' : '"' + q[0] + '"';
  aEl.textContent = '— ' + q[1];
}

const fxMem = {};
const CUR_SYM = { USD: '$', EUR: '€', UAH: '₴', GBP: '£', PLN: 'zł', JPY: '¥', CNY: '¥', CHF: 'Fr', CZK: 'Kč', SEK: 'kr', CAD: '$', AUD: '$' };
const crMem = { t: 0, key: '', data: null };
const COIN_IDS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', DOGE: 'dogecoin', XRP: 'ripple', ADA: 'cardano', TON: 'the-open-network', BNB: 'binancecoin', LTC: 'litecoin', TRX: 'tron', AVAX: 'avalanche-2', LINK: 'chainlink', DOT: 'polkadot', USDT: 'tether' };
function parseCoins(s) {
  return (s || '').toUpperCase().split(/[^A-Z]+/).filter(Boolean).slice(0, 8);
}
const fmtMoney = (n, d = 2) => (+n).toLocaleString('ru-RU', { maximumFractionDigits: d });

// (подробный прогноз объединён с погодой — один гибкий виджет)

async function loadCurrency(w) {
  const root = document.querySelector(`[data-wid="${w.id}"]`);
  if (!root) return;
  const box = root.querySelector('.w-rows');
  const base = ((w.base || 'UAH') + '').toUpperCase();
  const syms = (Array.isArray(w.symbols) ? w.symbols : []).map((s) => (s + '').toUpperCase()).filter((s) => /^[A-Z]{3}$/.test(s)).slice(0, 6);
  try {
    let d = fxMem[base];
    if (!d || Date.now() - d.t > 12 * 36e5) {
      const r = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      const j = await r.json();
      if (j.result !== 'success' || !j.rates) throw 0;
      d = fxMem[base] = { t: Date.now(), rates: j.rates };
    }
    box.innerHTML = '';
    syms.forEach((s) => {
      if (s === base || !d.rates[s]) return;
      const row = document.createElement('div');
      row.className = 'w-row';
      const cur = document.createElement('span');
      cur.textContent = `${CUR_SYM[s] || ''} ${s}`.trim();
      const sp = document.createElement('span');
      sp.className = 'd';
      const val = document.createElement('span');
      val.className = 'v';
      val.textContent = `${fmtMoney(1 / d.rates[s])} ${CUR_SYM[base] || base}`;
      row.append(cur, sp, val);
      box.appendChild(row);
    });
    if (!box.children.length) box.innerHTML = `<div class="w-row"><span class="d">${t('noCurr')}</span></div>`;
  } catch {
    box.innerHTML = `<div class="w-row"><span class="d">${t('noConn')}</span></div>`;
  }
}

async function loadCrypto(w) {
  const root = document.querySelector(`[data-wid="${w.id}"]`);
  if (!root) return;
  const box = root.querySelector('.w-rows');
  const syms = (Array.isArray(w.coins) ? w.coins : ['BTC', 'ETH']).map((s) => (s + '').toUpperCase()).filter(Boolean).slice(0, 8);
  const ids = [...new Set(syms.map((s) => COIN_IDS[s] || s.toLowerCase()))];
  try {
    const key = ids.join(',');
    if (!crMem.data || crMem.key !== key || Date.now() - crMem.t > 15 * 60e3) {
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(key)}&vs_currencies=usd&include_24hr_change=true`);
      crMem.data = await r.json();
      crMem.key = key;
      crMem.t = Date.now();
    }
    box.innerHTML = '';
    syms.forEach((s) => {
      const d = crMem.data[COIN_IDS[s] || s.toLowerCase()];
      if (!d || typeof d.usd !== 'number') return;
      const row = document.createElement('div');
      row.className = 'w-row';
      const cur = document.createElement('span');
      cur.textContent = s;
      const sp = document.createElement('span');
      sp.className = 'd';
      const val = document.createElement('span');
      val.className = 'v';
      val.textContent = `$${fmtMoney(Math.round(d.usd), 0)} `;
      const ch = document.createElement('span');
      ch.className = d.usd_24h_change >= 0 ? 'up' : 'down';
      ch.textContent = `${d.usd_24h_change >= 0 ? '+' : ''}${String(d.usd_24h_change.toFixed(1)).replace('.', ',')}%`;
      val.appendChild(ch);
      row.append(cur, sp, val);
      box.appendChild(row);
    });
    if (!box.children.length) box.innerHTML = `<div class="w-row"><span class="d">${t('noData')}</span></div>`;
  } catch {
    box.innerHTML = `<div class="w-row"><span class="d">${t('noConn')}</span></div>`;
  }
}

function loadAllDynamic() {
  state.board.forEach((x) => {
    if (x.type === 'weather') loadWeather(x);
    else if (x.type === 'currency') loadCurrency(x);
    else if (x.type === 'crypto') loadCrypto(x);
  });
}
setInterval(loadAllDynamic, 15 * 60e3);

// ---------- рендер ----------
function render() {
  applyI18n();
  const s = state.settings;
  document.documentElement.dataset.theme = s.theme;
  document.body.classList.toggle('editing', isEdit());

  const grid = $('#grid');
  grid.innerHTML = '';
  $('#empty').hidden = state.board.length > 0;
  state.board.forEach((w, i) => {
    const el = widgetEl(w);
    if (document.body.classList.contains('boot')) el.style.animationDelay = Math.min(i * 35, 400) + 'ms';
    grid.appendChild(el);
  });

  const open = path.length > 0;
  $('#folderView').hidden = !open;
  if (open) renderFolder();

  $('#clockBlock').style.display = s.showClock ? '' : 'none';
  syncSettingsForm();
  loadAllDynamic();
}

function renderFolder() {
  const { list, folder } = getFolderByPath();
  if (!folder) { path = []; render(); return; }
  $('#folderTitle').textContent = folder.title;
  $('#folderCount').textContent = list.length ? t('itemsCount', list.length) : t('emptyList');

  const c = $('#folderCrumbs');
  c.innerHTML = '';
  c.style.display = path.length > 1 ? '' : 'none';
  if (path.length > 1) {
    let arr = state.board;
    let first = true;
    path.forEach((id, idx) => {
      const f = arr.find((i) => i.id === id);
      if (!f) return;
      if (!first) {
        const sep = document.createElement('span');
        sep.textContent = '›';
        c.appendChild(sep);
      }
      first = false;
      if (idx === path.length - 1) {
        const s = document.createElement('span');
        s.className = 'cur';
        s.textContent = f.title;
        c.appendChild(s);
      } else {
        const b = document.createElement('button');
        b.textContent = f.title;
        b.title = t('crumbDrop');
        b.onclick = () => { path = path.slice(0, idx + 1); render(); };
        b.ondragover = (e) => { e.preventDefault(); b.classList.add('drop-target'); };
        b.ondragleave = () => b.classList.remove('drop-target');
        b.ondrop = (e) => { e.preventDefault(); e.stopPropagation(); b.classList.remove('drop-target'); moveItem(draggedId, id); };
        c.appendChild(b);
      }
      arr = f.children;
    });
  }

  const grid = $('#folderGrid');
  grid.innerHTML = '';
  $('#folderEmpty').hidden = list.length > 0;
  list.forEach((it) => grid.appendChild(tileEl(it)));
  grid.ondragover = (e) => e.preventDefault();
  grid.ondrop = (e) => {
    if (e.target !== grid) return;
    const found = findItem(draggedId);
    if (!found) return;
    found.parent.children.splice(found.parent.children.findIndex((x) => x.id === draggedId), 1);
    list.push(found.item);
    save();
  };
}

// ---------- форма настроек ----------
function syncSettingsForm() {
  const b = state.settings.bg;
  $('#sTheme').value = state.settings.theme;
  $('#sClock').checked = state.settings.showClock;
  $('#sLang').value = state.settings.lang || 'auto';
  $('#sBgMode').value = b.mode;
  $('#sBgInterval').value = String(b.intervalMin);
  $('#sCustomUrls').value = (b.customUrls || []).join('\n');
  $('#sBgValue').value = b.color || '';
  $('#sBlur').value = b.blur; $('#blurVal').textContent = b.blur + 'px';
  $('#sDim').value = b.dim; $('#dimVal').textContent = b.dim + '%';
  $('#bgCuratedBox').hidden = !(b.mode === 'curated' || b.mode === 'custom');
  $('#bgCustomBox').hidden = b.mode !== 'custom';
  $('#bgUploadBox').hidden = b.mode !== 'upload';
  $('#bgColorBox').hidden = !(b.mode === 'gradient' || b.mode === 'color');
  const box = $('#bgPresets');
  box.innerHTML = '';
  PRESETS.forEach((p) => {
    const btn = document.createElement('button');
    btn.style.background = p;
    if (b.color === p) btn.classList.add('active');
    btn.onclick = () => { b.color = p; b.mode = p.startsWith('linear') ? 'gradient' : 'color'; saveBg(); };
    box.appendChild(btn);
  });
}
function saveBg() { store.save(state); showBg(); syncSettingsForm(); }

// создание и изменение ссылок, папок и виджетов — только через openWModal выше

// ---------- модалка виджета ----------
// единое меню: ссылка и папка — отдельно без выбора типа, тип — только для виджетов
function openWModal(mode, widget = null, preset = null, showAll = false) {
  wEditing = { mode, widget };
  manualTitle = false; autoTitle = null;
  if (titleCtl) { titleCtl.abort(); titleCtl = null; }
  $('#wmodal').hidden = false;
  const wtype = widget?.type || preset || 'note';
  $('#wmodalTitle').textContent = mode === 'create'
    ? (preset === 'link' ? t('wNewLink') : preset === 'folder' ? t('wNewFolder') : t('wNewWidget'))
    : t('wEdit');
  [...$('#wType').options].forEach((o) => {
    if (mode !== 'create') o.hidden = o.value !== wtype;
    else if (preset) o.hidden = true;
    else if (path.length > 0 && !showAll) o.hidden = o.value !== 'link' && o.value !== 'folder';
    else o.hidden = o.value === 'link' || o.value === 'folder';
  });
  $('#wTypeWrap').style.display = (mode === 'create' && !preset) ? '' : 'none';
  $('#wType').disabled = mode !== 'create';
  $('#wType').value = wtype;
  $('#wTitle').value = widget?.title || '';
  $('#wUrl').value = widget?.url || '';
  $('#wCity').value = widget?.city || '';
  $('#wCur').checked = widget?.showCurrent !== false;
  $('#wDays').value = widget?.days ?? 3;
  $('#wHours').value = widget?.hours ?? 0;
  $('#wBase').value = widget?.base || 'UAH';
  [...$('#wSyms').options].forEach((o) => { o.selected = (widget?.symbols || ['USD', 'EUR']).includes(o.value); });
  $('#wCoins').value = (widget?.coins || ['BTC', 'ETH']).join(', ');
  syncWForm();
  ($('#wCityWrap').style.display !== 'none' ? $('#wCity') : $('#wBaseWrap').style.display !== 'none' ? $('#wBase') : $('#wTitleWrap').style.display !== 'none' ? $('#wTitle') : $('#wType')).focus();
}
function closeWModal() { $('#wmodal').hidden = true; wEditing = null; if (titleCtl) { titleCtl.abort(); titleCtl = null; } }
let manualTitle = false, autoTitle = null, titleCtl = null;
(function initTitleAutofill() {
  const urlEl = $('#wUrl'), titleEl = $('#wTitle');
  let deb = null;
  const schedule = (now) => {
    clearTimeout(deb);
    if (now) { tryAutofill(); return; }
    deb = setTimeout(tryAutofill, 600);
  };
  urlEl.addEventListener('input', () => schedule(false));
  urlEl.addEventListener('paste', () => setTimeout(() => schedule(true), 0));
  urlEl.addEventListener('blur', tryAutofill);
  titleEl.addEventListener('input', () => {
    const v = titleEl.value;
    manualTitle = v.trim() !== '' && v !== autoTitle;
  });
  $('#wType').addEventListener('change', () => { if ($('#wType').value !== 'link' && titleCtl) { titleCtl.abort(); titleCtl = null; } });
})();
async function tryAutofill() {
  if ($('#wmodal').hidden) return;
  if ($('#wType').value !== 'link' || $('#wUrlWrap').style.display === 'none') return;
  const url = normalizeUrl($('#wUrl').value.trim());
  if (!/^https?:\/\/.+\..+/.test(url)) return;
  if (manualTitle) return;
  const titleEl = $('#wTitle');
  if (!titleEl.value.trim()) {
    const host = prettyHost(url);
    if (host) { titleEl.value = host; autoTitle = host; }
  }
  if (titleCtl) titleCtl.abort();
  titleCtl = new AbortController();
  const sig = titleCtl.signal;
  const oldPh = titleEl.placeholder;
  titleEl.placeholder = t('fetchingTitle');
  try {
    const fetched = await fetchTitle(url, sig);
    if (!sig.aborted && fetched && !manualTitle && (titleEl.value.trim() === '' || titleEl.value === autoTitle)) {
      titleEl.value = fetched;
      autoTitle = fetched;
    }
  } finally {
    if (!sig.aborted) titleEl.placeholder = oldPh;
  }
}
function syncWForm() {
  const t = $('#wType').value;
  $('#wTitleWrap').style.display = ['link', 'folder', 'note', 'checklist'].includes(t) ? '' : 'none';
  $('#wUrlWrap').style.display = t === 'link' ? '' : 'none';
  const isW = t === 'weather';
  $('#wCityWrap').style.display = isW ? '' : 'none';
  $('#wCurWrap').style.display = isW ? '' : 'none';
  $('#wDaysWrap').style.display = isW ? '' : 'none';
  $('#wHoursWrap').style.display = isW ? '' : 'none';
  const isCur = t === 'currency';
  $('#wBaseWrap').style.display = isCur ? '' : 'none';
  $('#wSymsWrap').style.display = isCur ? '' : 'none';
  $('#wCoinsWrap').style.display = t === 'crypto' ? '' : 'none';
}

// ---------- контекстное меню (правая кнопка) ----------
function closeCtx() { const m = $('#ctx'); if (m) m.hidden = true; }
function openCtx(x, y, items) {
  const m = $('#ctx');
  m.innerHTML = '';
  items.forEach((it) => {
    if (it.sep) { const s = document.createElement('div'); s.className = 'sep'; m.appendChild(s); return; }
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = it.label;
    if (it.danger) b.classList.add('danger');
    b.onclick = (e) => { e.stopPropagation(); closeCtx(); if (it.fn) it.fn(); };
    m.appendChild(b);
  });
  m.hidden = false;
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(x, window.innerWidth - r.width - 8)) + 'px';
  m.style.top = Math.max(8, Math.min(y, window.innerHeight - r.height - 8)) + 'px';
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    ta.remove();
  }
}
function ctxDelete(item) {
  const f = findItem(item.id);
  if (!f) return;
  const n = (item.children || []).length;
  if (item.type === 'folder' && n && !confirm(t('delFolder', item.title, n))) return;
  else if (item.type !== 'folder' && !confirm(t('delOne', item.title || t('untitled')))) return;
  f.parent.children.splice(f.parent.children.findIndex((x) => x.id === item.id), 1);
  path = path.filter((pid) => findItem(pid));
  save();
}
function ctxItemsLink(item, nested) {
  const items = [
    { label: t('mOpen'), fn: () => window.open(item.url, '_blank') },
    { label: t('mCopy'), fn: () => copyText(item.url) },
    { label: t('mEdit'), fn: () => openWModal('edit', item) },
  ];
  if (nested) items.push({ label: t('mToBoard'), fn: () => moveToBoard(item.id) });
  items.push({ sep: true }, { label: t('mDel'), danger: true, fn: () => ctxDelete(item) });
  return items;
}
function ctxItemsFolder(item, nested, openFn) {
  const items = [
    { label: t('mOpen'), fn: openFn },
    { label: t('mRename'), fn: () => openWModal('edit', item) },
  ];
  if (nested) items.push({ label: t('mToBoard'), fn: () => moveToBoard(item.id) });
  items.push({ sep: true }, { label: t('mDel'), danger: true, fn: () => ctxDelete(item) });
  return items;
}
function ctxItemsWidget(w) {
  const items = [];
  if (w.type === 'note' || w.type === 'checklist') items.push({ label: t('mRename'), fn: () => openWModal('edit', w) });
  if (w.type === 'weather') items.push({ label: t('mSetupWeather'), fn: () => openWModal('edit', w) });
  if (w.type === 'currency') items.push({ label: t('mSetupCurr'), fn: () => openWModal('edit', w) });
  if (w.type === 'crypto') items.push({ label: t('mSetupCoins'), fn: () => openWModal('edit', w) });
  if (items.length) items.push({ sep: true });
  items.push({ label: t('mDel'), danger: true, fn: () => ctxDelete(w) });
  return items;
}
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#ctx')) closeCtx(); }, true);
document.addEventListener('scroll', closeCtx, true);
window.addEventListener('blur', closeCtx);

// ---------- события ----------
$('#addBtn').onclick = () => openWModal('create');

$('#wType').onchange = syncWForm;
$('#wmodalCancel').onclick = closeWModal;
$('#wmodal').addEventListener('mousedown', (e) => { if (e.target.id === 'wmodal') closeWModal(); });
$('#wmodalForm').onsubmit = (e) => {
  e.preventDefault();
  const t = $('#wType').value;
  const title = $('#wTitle').value.trim() || I18N[lang()].untitled;
  if (wEditing.mode === 'edit') {
    const w = wEditing.widget;
    if (t !== 'link') delete w.url;
    if (t !== 'weather' && t !== 'forecast') delete w.city;
    if (t === 'link') { w.title = title; w.url = normalizeUrl($('#wUrl').value); }
    else if (t === 'folder' || t === 'note' || t === 'checklist') { w.title = title; }
    else if (t === 'weather') {
      w.city = $('#wCity').value.trim() || '';
      w.title = I18N[lang()].tWeather;
      w.showCurrent = $('#wCur').checked;
      w.days = Math.min(7, Math.max(0, +$('#wDays').value || 0));
      w.hours = Math.min(24, Math.max(0, +$('#wHours').value || 0));
      delete wxMem[w.id];
    }
    else if (t === 'currency') { w.base = $('#wBase').value || 'UAH'; const ps = [...$('#wSyms').selectedOptions].map((o) => o.value).slice(0, 6); w.symbols = ps.length ? ps : ['USD', 'EUR']; }
    else if (t === 'crypto') { const cc = parseCoins($('#wCoins').value); w.coins = cc.length ? cc : ['BTC', 'ETH']; }
  } else {
    const { list } = getFolderByPath();
    const target = (list === state.board || t === 'link' || t === 'folder') ? list : state.board;
    const r = target === state.board ? cascadeRect(t) : {};
    if (t === 'link') {
      const url = normalizeUrl($('#wUrl').value);
      if (!url) return alert(t('needUrl'));
      target.push({ id: uid(), type: 'link', title, url, ...r });
    }
    else if (t === 'folder') target.push({ id: uid(), type: 'folder', title, children: [], ...r });
    else if (t === 'note') target.push({ id: uid(), type: 'note', title, text: '', ...r });
    else if (t === 'checklist') target.push({ id: uid(), type: 'checklist', title, items: [], ...r });
    else if (t === 'weather') target.push({ id: uid(), type: 'weather', title: I18N[lang()].tWeather, city: $('#wCity').value.trim(), showCurrent: $('#wCur').checked, days: Math.min(7, Math.max(0, +$('#wDays').value || 0)), hours: Math.min(24, Math.max(0, +$('#wHours').value || 0)), ...r });
    else if (t === 'currency') { const cs = [...$('#wSyms').selectedOptions].map((o) => o.value).slice(0, 6); target.push({ id: uid(), type: 'currency', title: I18N[lang()].tCurrency, base: $('#wBase').value || 'UAH', symbols: cs.length ? cs : ['USD', 'EUR'], ...r }); }
    else if (t === 'crypto') { const cc = parseCoins($('#wCoins').value); target.push({ id: uid(), type: 'crypto', title: I18N[lang()].tCrypto, coins: cc.length ? cc : ['BTC', 'ETH'], ...r }); }
    else if (t === 'quote') target.push({ id: uid(), type: 'quote', title: I18N[lang()].tQuote, ...r });
  }
  closeWModal(); save();
};

// окно папки
// окно папки закрывается кликом за его пределами; + сверху — добавить закладку
$('#folderAddBtn').onclick = () => openWModal('create', null, 'link');
// клик по фону всегда закрывает папку: mousedown при настоящем drag-and-drop
// на фон попасть не может (drag стартует с плитки), так что гард не нужен и не должен залипать
$('#folderView').addEventListener('mousedown', (e) => { if (e.target.id === 'folderView') { path = []; render(); } });
document.addEventListener('dragend', () => { draggedId = null; document.body.classList.remove('dragging'); });
// страховка: если dragend потерялся, класс-подсказка не должен залипать
document.addEventListener('pointerup', () => document.body.classList.remove('dragging'));
// дроп на фон за пределами окна папки = вынести элемент на доску
$('#folderView').addEventListener('dragover', (e) => { e.preventDefault(); });
$('#folderView').addEventListener('drop', (e) => {
  if (e.target.id !== 'folderView') return;
  e.preventDefault();
  moveToBoard(draggedId);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('#ctx').hidden) { closeCtx(); return; }
  if (!$('#wmodal').hidden) closeWModal();
  else if (!$('#settingsModal').hidden) $('#settingsModal').hidden = true;
  else if (path.length) { path = []; render(); }
});

$('#editToggle').onclick = () => {
  document.body.dataset.edit = isEdit() ? '' : '1';
  render();
};
$('#nextBgBtn').onclick = () => nextBg(1);
$('#bgNextBtn').onclick = () => nextBg(1);
$('#bgShuffleBtn').onclick = () => {
  const list = bgList();
  state.settings.bg.index = Math.floor(Math.random() * list.length);
  state.settings.bg.lastChange = Date.now();
  saveBg();
};

$('#settingsBtn').onclick = () => { syncSettingsForm(); $('#settingsModal').hidden = false; };
$('#settingsBg').onclick = () => { $('#settingsModal').hidden = true; };
$('#settingsClose').onclick = () => { $('#settingsModal').hidden = true; };
$('#settingsSave').onclick = () => {
  const b = state.settings.bg;
  state.settings.theme = $('#sTheme').value;
  state.settings.showClock = $('#sClock').checked;
  state.settings.lang = $('#sLang').value;
  b.mode = $('#sBgMode').value;
  b.intervalMin = +$('#sBgInterval').value;
  b.customUrls = $('#sCustomUrls').value.split('\n').map((s) => s.trim()).filter(Boolean);
  if ($('#sBgValue').value.trim()) b.color = $('#sBgValue').value.trim();
  b.blur = +$('#sBlur').value;
  b.dim = +$('#sDim').value;
  $('#settingsModal').hidden = true;
  store.save(state); scheduleBg(); showBg(); render();
};
$('#sBlur').oninput = (e) => { state.settings.bg.blur = +e.target.value; $('#blurVal').textContent = e.target.value + 'px'; applyFilters(); };
$('#sDim').oninput = (e) => { state.settings.bg.dim = +e.target.value; $('#dimVal').textContent = e.target.value + '%'; applyFilters(); };
$('#sBlur').onchange = $('#sDim').onchange = () => store.save(state);
$('#sBgMode').onchange = (e) => { state.settings.bg.mode = e.target.value; syncSettingsForm(); showBg(); };
$('#sLang').onchange = (e) => { state.settings.lang = e.target.value; store.save(state); render(); };

$('#sUpload').onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const dataUrl = await fileToDataUrl(f);
    state.settings.bg.upload = dataUrl;
    state.settings.bg.mode = 'upload';
    saveBg();
  } catch { alert(t('badFile')); }
  e.target.value = '';
};
$('#uploadClear').onclick = () => { state.settings.bg.upload = ''; saveBg(); };

$('#exportBtn').onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'desktop-backup.json';
  a.click();
};
$('#importBtn').onclick = () => $('#importFile').click();
$('#importFile').onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = migrate(JSON.parse(r.result));
      if (!data.board || !data.settings) throw 0;
      state = data; path = [];
      store.save(state); scheduleBg(); showBg(); render();
    } catch { alert(t('badBackup')); }
  };
  r.readAsText(f);
  e.target.value = '';
};
$('#resetBtn').onclick = () => {
  if (!confirm(t('resetConfirm'))) return;
  state = defaultState(); path = [];
  $('#settingsModal').hidden = true;
  store.save(state); scheduleBg(); showBg(); render();
};

function tick() {
  const now = new Date();
  const lc = loc();
  $('#clock').textContent = now.toLocaleTimeString(lc, { hour: '2-digit', minute: '2-digit' });
  $('#date').textContent = now.toLocaleDateString(lc, { weekday: 'long', day: 'numeric', month: 'long' });
}
setInterval(tick, 5000);
tick();

let winT = null;
window.addEventListener('resize', () => {
  clearTimeout(winT);
  winT = setTimeout(() => {
    const a = document.activeElement;
    if (a && a.closest && a.closest('.widget') && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) return;
    render();
  }, 300);
});
// правая кнопка по пустому месту: выпадающий список создания
$('#grid').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  openCtx(e.clientX, e.clientY, [
    { label: t('mAddLink'), fn: () => openWModal('create', null, 'link') },
    { label: t('mAddFolder'), fn: () => openWModal('create', null, 'folder') },
    { label: t('mAddWidget'), fn: () => openWModal('create') },
  ]);
});
$('#folderGrid').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  openCtx(e.clientX, e.clientY, [
    { label: t('mAddLink'), fn: () => openWModal('create', null, 'link') },
    { label: t('mAddFolder'), fn: () => openWModal('create', null, 'folder') },
    { label: t('mAddWidget'), fn: () => openWModal('create', null, null, true) },
  ]);
});
store.load().then((s) => { state = s; scheduleBg(); showBg(); render(); setTimeout(() => document.body.classList.remove('boot'), 1000); });
