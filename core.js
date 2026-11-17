// R.Db core — общее для новой вкладки, попапа и фонового скрипта.
// Модель, хранилище (local + sync), миграция со старой версии, автоиконки и автоназвания, i18n.
(function (G) {
'use strict';

const ext = G.browser || G.chrome || null;

// ---------- утилиты ----------
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function normalizeUrl(u) {
  u = (u || '').trim();
  if (!u) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return u; // уже со схемой (http, https, ftp, smb…)
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/|$)/i.test(u)) return 'http://' + u;
  return 'https://' + u;
}
function parseUrl(u) { try { return new URL(u); } catch { return null; } }
function isLocalHost(host) {
  host = (host || '').toLowerCase();
  return !host.includes('.') || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|\[)/.test(host)
    || /^[\d.]+$/.test(host) || /\.(local|lan|home|internal|arpa|ts\.net|home\.arpa)$/.test(host);
}

// ---------- i18n ----------
const DICT = {
  ru: {
    morning: 'Доброе утро', day: 'Добрый день', evening: 'Добрый вечер', night: 'Доброй ночи',
    search: 'Поиск по закладкам и в сети', searchWeb: 'Искать в сети', openLink: 'Открыть',
    addGroup: 'Группа', addWidget: 'Виджет', addLink: 'Закладка', add: 'Добавить',
    newGroup: 'Новая группа', inbox: 'Входящие', bookmarks: 'Закладки', untitled: 'Без названия',
    edit: 'Изменить', del: 'Удалить', copy: 'Копировать ссылку', openNew: 'Открыть в новой вкладке',
    moveTo: 'Переместить в…', confirmDel: 'Удалить «%s»?', confirmDelGroup: 'Удалить группу «%s» вместе с содержимым?',
    save: 'Сохранить', cancel: 'Отмена', done: 'Готово', close: 'Закрыть',
    url: 'Адрес', title: 'Название', desc: 'Описание', descPh: 'необязательно', group: 'Группа',
    icon: 'Иконка', iconAuto: 'Авто', iconSearch: 'Найти иконку: proxmox, jellyfin…', iconUrl: 'Ссылка или файл', iconText: 'Эмодзи',
    upload: 'Файл', fetching: 'Подтягиваю название…', editLink: 'Закладка', newLink: 'Новая закладка',
    editGroup: 'Группа', groupKind: 'Тип', view: 'Вид', vTiles: 'Плитки', vList: 'Список', vCompact: 'Компактно',
    width: 'Ширина', w1: '1 колонка', w2: '2 колонки', w3: '3 колонки', wFull: 'Во всю ширину',
    kLinks: 'Закладки', kNote: 'Заметка', kTodo: 'Список дел', kWeather: 'Погода', kCurrency: 'Курсы валют', kCrypto: 'Крипта',
    kClock: 'Мировое время', kCalendar: 'Календарь', kCountdown: 'Обратный отсчёт', kRss: 'RSS-лента', kIframe: 'Встроенная страница',
    kGithub: 'Релизы GitHub', kTopsites: 'Часто посещаемые',
    zones: 'Города / часовые пояса через запятую', zonesHint: 'Europe/Kyiv, Europe/Warsaw, America/New_York',
    events: 'События — по одному на строку: «2026-12-31 Новый год»', feed: 'Адрес RSS или Atom', count: 'Сколько показывать',
    pageUrl: 'Адрес страницы (Grafana, Uptime Kuma, статус…)', height: 'Высота, px', repos: 'Репозитории owner/repo через запятую',
    grant: 'Дать доступ', needAccess: 'Нужен доступ к %s', noAccess: 'Нет доступа', today: 'Сегодня', passed: 'прошло', inDays: 'дн.',
    noFrame: 'Сайт мог запретить встраивание — тогда откроется пусто', noEvents: 'Добавь события в настройках виджета', widgets: 'Виджеты',
    city: 'Город', days: 'Дней прогноза', hours: 'Часов прогноза', base: 'Базовая валюта', symbols: 'Валюты', coins: 'Монеты через запятую',
    notePh: 'Пиши здесь…', todoPh: 'Новое дело…', noCity: 'Укажи город в настройках виджета', err: 'Не удалось загрузить',
    emptyGroup: 'Перетащи сюда ссылку или нажми +', emptyBoard: 'Здесь пока пусто',
    emptyHint: 'Вставь ссылку (Ctrl+V), перетащи её из адресной строки или нажми кнопку ниже',
    settings: 'Настройки', sLook: 'Вид', sBg: 'Фон', sBehavior: 'Поведение', sData: 'Данные', sAbout: 'О расширении',
    sName: 'Имя для приветствия', sNamePh: 'необязательно', sClock: 'Часы и приветствие', sSearch: 'Строка поиска',
    sDesc: 'Описания под закладками', sAccent: 'Акцент', sDensity: 'Плотность', dComfort: 'Свободно', dCompact: 'Плотно',
    sMaxw: 'Ширина страницы', mwNormal: 'Обычная', mwWide: 'Широкая', mwFull: 'Во весь экран',
    sCols: 'Колонок', colsAuto: 'Авто',
    sEngine: 'Поисковик', sEngineCustom: 'Свой (URL с %s)', sNewTab: 'Открывать закладки в новой вкладке',
    sLock: 'Заблокировать раскладку', sLang: 'Язык', langAuto: 'Авто', sSync: 'Синхронизация через аккаунт браузера',
    bgCurated: 'Фото (подборка)', bgCustom: 'Свои ссылки', bgUpload: 'Свой файл', bgColor: 'Цвет / градиент',
    bgNext: 'Следующее фото', bgUrls: 'Ссылки на картинки, по одной на строку', bgChange: 'Менять фото',
    int0: 'При каждом открытии', int15: 'Каждые 15 минут', int60: 'Каждый час', int1440: 'Раз в день', intNever: 'Никогда',
    blur: 'Размытие', dim: 'Затемнение', pickFile: 'Выбрать файл',
    exportJson: 'Экспорт', importJson: 'Импорт', importBm: 'Из закладок браузера', reset: 'Сбросить всё',
    confirmReset: 'Сбросить всё к начальному виду? Экспортируй сначала, если нужно.',
    imported: 'Импортировано: %s', importErr: 'Не удалось прочитать файл', bmPick: 'Какую папку закладок импортировать?',
    bmDenied: 'Нет доступа к закладкам', bmImport: 'Импортировать', bmItems: 'ссылок: %s',
    added: 'Добавлено в «%s»', undo: 'Отменить', deleted: 'Удалено',
    about: 'Рабочий стол новой вкладки в духе homelab-дашбордов. Всё хранится в браузере, без серверов и аккаунтов.',
    support: 'Поддержать', photo: 'Фото',
    popTitle: 'Добавить на стол', popAdded: 'Готово!', popOpen: 'Открыть стол', popNoTab: 'Эту страницу добавить нельзя',
    ctxAddPage: 'Добавить страницу на стол R.Db', ctxAddLink: 'Добавить ссылку на стол R.Db',
    keys: 'Подсказка: / — поиск, Ctrl+V — вставить ссылку, правый клик — меню',
    collapse: 'Свернуть', expand: 'Развернуть', moveUp: 'Выше', moveDown: 'Ниже',
  },
  en: {
    morning: 'Good morning', day: 'Good afternoon', evening: 'Good evening', night: 'Good night',
    search: 'Search bookmarks and the web', searchWeb: 'Search the web', openLink: 'Open',
    addGroup: 'Group', addWidget: 'Widget', addLink: 'Bookmark', add: 'Add',
    newGroup: 'New group', inbox: 'Inbox', bookmarks: 'Bookmarks', untitled: 'Untitled',
    edit: 'Edit', del: 'Delete', copy: 'Copy link', openNew: 'Open in new tab',
    moveTo: 'Move to…', confirmDel: 'Delete “%s”?', confirmDelGroup: 'Delete group “%s” with everything in it?',
    save: 'Save', cancel: 'Cancel', done: 'Done', close: 'Close',
    url: 'URL', title: 'Title', desc: 'Description', descPh: 'optional', group: 'Group',
    icon: 'Icon', iconAuto: 'Auto', iconSearch: 'Find an icon: proxmox, jellyfin…', iconUrl: 'Link or file', iconText: 'Emoji',
    upload: 'File', fetching: 'Fetching title…', editLink: 'Bookmark', newLink: 'New bookmark',
    editGroup: 'Group', groupKind: 'Type', view: 'View', vTiles: 'Tiles', vList: 'List', vCompact: 'Compact',
    width: 'Width', w1: '1 column', w2: '2 columns', w3: '3 columns', wFull: 'Full width',
    kLinks: 'Bookmarks', kNote: 'Note', kTodo: 'To-do', kWeather: 'Weather', kCurrency: 'Exchange rates', kCrypto: 'Crypto',
    kClock: 'World clock', kCalendar: 'Calendar', kCountdown: 'Countdown', kRss: 'RSS feed', kIframe: 'Embedded page',
    kGithub: 'GitHub releases', kTopsites: 'Most visited',
    zones: 'Time zones, comma separated', zonesHint: 'Europe/London, Europe/Berlin, America/New_York',
    events: 'Events — one per line: “2026-12-31 New Year”', feed: 'RSS or Atom URL', count: 'How many to show',
    pageUrl: 'Page URL (Grafana, Uptime Kuma, status page…)', height: 'Height, px', repos: 'Repositories owner/repo, comma separated',
    grant: 'Grant access', needAccess: 'Needs access to %s', noAccess: 'No access', today: 'Today', passed: 'ago', inDays: 'd',
    noFrame: 'The site may forbid embedding — it will then stay blank', noEvents: 'Add events in the widget settings', widgets: 'Widgets',
    city: 'City', days: 'Forecast days', hours: 'Forecast hours', base: 'Base currency', symbols: 'Currencies', coins: 'Coins, comma separated',
    notePh: 'Write here…', todoPh: 'New task…', noCity: 'Set a city in the widget settings', err: 'Failed to load',
    emptyGroup: 'Drop a link here or press +', emptyBoard: 'Nothing here yet',
    emptyHint: 'Paste a link (Ctrl+V), drag one from the address bar, or use the button below',
    settings: 'Settings', sLook: 'Look', sBg: 'Background', sBehavior: 'Behavior', sData: 'Data', sAbout: 'About',
    sName: 'Name for greeting', sNamePh: 'optional', sClock: 'Clock and greeting', sSearch: 'Search bar',
    sDesc: 'Descriptions under bookmarks', sAccent: 'Accent', sDensity: 'Density', dComfort: 'Comfortable', dCompact: 'Compact',
    sMaxw: 'Page width', mwNormal: 'Normal', mwWide: 'Wide', mwFull: 'Full screen',
    sCols: 'Columns', colsAuto: 'Auto',
    sEngine: 'Search engine', sEngineCustom: 'Custom (URL with %s)', sNewTab: 'Open bookmarks in a new tab',
    sLock: 'Lock layout', sLang: 'Language', langAuto: 'Auto', sSync: 'Sync via browser account',
    bgCurated: 'Photos (curated)', bgCustom: 'My links', bgUpload: 'My file', bgColor: 'Color / gradient',
    bgNext: 'Next photo', bgUrls: 'Image links, one per line', bgChange: 'Change photo',
    int0: 'Every new tab', int15: 'Every 15 minutes', int60: 'Every hour', int1440: 'Once a day', intNever: 'Never',
    blur: 'Blur', dim: 'Dim', pickFile: 'Choose file',
    exportJson: 'Export', importJson: 'Import', importBm: 'From browser bookmarks', reset: 'Reset everything',
    confirmReset: 'Reset everything to defaults? Export first if needed.',
    imported: 'Imported: %s', importErr: 'Could not read the file', bmPick: 'Which bookmarks folder to import?',
    bmDenied: 'No access to bookmarks', bmImport: 'Import', bmItems: 'links: %s',
    added: 'Added to “%s”', undo: 'Undo', deleted: 'Deleted',
    about: 'A new-tab desktop in the spirit of homelab dashboards. Everything lives in your browser — no servers, no accounts.',
    support: 'Support', photo: 'Photo',
    popTitle: 'Add to desk', popAdded: 'Done!', popOpen: 'Open desk', popNoTab: 'This page can’t be added',
    ctxAddPage: 'Add page to R.Db desk', ctxAddLink: 'Add link to R.Db desk',
    keys: 'Tip: / — search, Ctrl+V — paste a link, right click — menu',
    collapse: 'Collapse', expand: 'Expand', moveUp: 'Move up', moveDown: 'Move down',
  },
};
let curLang = null;
function detectLang() { return /^(ru|uk|be|kk)/i.test((G.navigator && navigator.language) || '') ? 'ru' : 'en'; }
function setLang(l) { curLang = (l === 'ru' || l === 'en') ? l : detectLang(); }
function t(key, ...a) {
  let s = (DICT[curLang || detectLang()] || DICT.en)[key] ?? DICT.en[key] ?? key;
  a.forEach((v) => { s = s.replace('%s', v); });
  return s;
}

// ---------- иконки ----------
// индекс из icons-index.js: имя -> источник; '*' — есть светлый вариант для тёмного фона
let ICONS = null;
function iconIndex() {
  if (ICONS) return ICONS;
  ICONS = { byNorm: new Map(), names: [] };
  const eat = (str, src) => (str || '').split(',').forEach((raw) => {
    if (!raw) return;
    const light = raw.endsWith('*');
    const name = light ? raw.slice(0, -1) : raw;
    const rec = { name, src, light };
    ICONS.names.push(rec);
    const k = norm(name);
    if (!ICONS.byNorm.has(k)) ICONS.byNorm.set(k, rec);
  });
  eat(G.ICON_DI, 'di');
  eat(G.ICON_SH, 'sh');
  return ICONS;
}
function iconRecUrl(rec) {
  const n = rec.light ? rec.name + '-light' : rec.name;
  return rec.src === 'di'
    ? `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/${n}.svg`
    : `https://cdn.jsdelivr.net/gh/selfhst/icons/svg/${n}.svg`;
}
function iconRef(rec) { return rec.src + ':' + rec.name; }
function iconFromRef(ref) {
  const m = /^(di|sh):(.+)$/.exec(ref || '');
  if (!m) return null;
  const rec = iconIndex().byNorm.get(norm(m[2]));
  return rec && rec.name === m[2] ? rec : { name: m[2], src: m[1], light: false };
}
function searchIcons(q, limit = 40) {
  const k = norm(q);
  if (!k) return [];
  const idx = iconIndex();
  const starts = [], inside = [];
  for (const r of idx.names) {
    const n = norm(r.name);
    if (n.startsWith(k)) starts.push(r); else if (n.includes(k)) inside.push(r);
    if (starts.length >= limit) break;
  }
  starts.sort((a, b) => a.name.length - b.name.length);
  return starts.concat(inside).slice(0, limit);
}

// синонимы и сокращения, которые встречаются в homelab
const ALIASES = {
  pve: 'proxmox', proxmoxve: 'proxmox', pbs: 'proxmox-backup-server', hass: 'home-assistant', ha: 'home-assistant',
  homeassistant: 'home-assistant', npm: 'nginx-proxy-manager', nginxpm: 'nginx-proxy-manager', qbit: 'qbittorrent', qb: 'qbittorrent',
  kuma: 'uptime-kuma', uptime: 'uptime-kuma', adguard: 'adguard-home', agh: 'adguard-home', pihole: 'pi-hole', dsm: 'synology-dsm',
  nas: 'synology', paperless: 'paperless-ngx', vw: 'vaultwarden', bw: 'bitwarden', wgeasy: 'wireguard', wg: 'wireguard',
  z2m: 'zigbee2mqtt', nodered: 'node-red', abs: 'audiobookshelf', seerr: 'jellyseerr', tg: 'telegram',
  twitter: 'x', yt: 'youtube', gpt: 'chatgpt', claude: 'claude-ai', gemini: 'google-gemini', ytmusic: 'youtube-music',
};
// стандартные порты популярных self-hosted сервисов: http://192.168.1.10:8096 -> Jellyfin
const PORTS = {
  8006: 'proxmox', 8007: 'proxmox-backup-server', 32400: 'plex', 8096: 'jellyfin', 8920: 'jellyfin', 9443: 'portainer',
  8123: 'home-assistant', 3001: 'uptime-kuma', 81: 'nginx-proxy-manager', 8989: 'sonarr', 7878: 'radarr', 8686: 'lidarr',
  8787: 'readarr', 9696: 'prowlarr', 6767: 'bazarr', 5055: 'overseerr', 8181: 'tautulli', 2283: 'immich', 8384: 'syncthing',
  19999: 'netdata', 4533: 'navidrome', 13378: 'audiobookshelf', 5001: 'synology-dsm', 8443: 'unifi', 9090: 'cockpit',
  7575: 'homarr', 8112: 'deluge', 9091: 'transmission', 8200: 'duplicati', 61208: 'glances', 9925: 'mealie', 10000: 'webmin',
  2342: 'photoprism', 6789: 'nzbget', 9117: 'jackett', 8265: 'tdarr', 5678: 'n8n', 1880: 'node-red', 6052: 'esphome',
  3579: 'ombi', 5076: 'nzbhydra2', 8086: 'influxdb', 5380: 'technitium', 3000: 'grafana', 51821: 'wireguard',
};
const STOP = new Set(['www', 'com', 'org', 'net', 'io', 'ru', 'su', 'by', 'ua', 'kz', 'pp', 'dev', 'app', 'me', 'info', 'online', 'site', 'web',
  'cloud', 'ai', 'tech', 'pro', 'media', 'local', 'lan', 'home', 'internal', 'corp', 'biz', 'tv', 'cc', 'co', 'uk', 'de', 'pl', 'eu', 'us',
  'name', 'page', 'top', 'xyz', 'ts', 'github', 'vercel', 'netlify', 'pages', 'm', 'mobile', 'en', 'my', 'api', 'login', 'auth', 'admin', 'panel',
  'dashboard', 'dash', 'status', 'docs', 'doc', 'wiki', 'blog', 'shop', 'store', 'portal', 'files', 'file', 'mail', 'news', 'help', 'support',
  'search', 'start', 'go', 'link', 'links', 'tailnet', 'server', 'srv', 'host', 'node', 'vpn', 'proxy', 'git', 'cdn', 'static', 'img']);
// хостинги, где имя проекта — это поддомен: fmhy.vercel.app -> Fmhy
const PLATFORMS = /\.(github\.io|vercel\.app|netlify\.app|pages\.dev|gitlab\.io|onrender\.com|herokuapp\.com|web\.app|firebaseapp\.com|surge\.sh|glitch\.me)$/;

function lookupName(word, min = 2) {
  const k = norm(word);
  if (!k || k.length < min) return null;
  const idx = iconIndex();
  const a = ALIASES[k];
  if (a) return idx.byNorm.get(norm(a)) || null;
  return idx.byNorm.get(k) || null;
}
// главное: угадать сервис по названию, хосту и порту
function guessApp(url, title) {
  const idx = iconIndex();
  if (title) {
    const whole = lookupName(title, 1);
    if (whole) return whole;
    for (const w of title.split(/[\s/|·•:—–()[\]]+/)) {
      if (/^\d+$/.test(w)) continue;
      const r = lookupName(w);
      if (r) return r;
    }
  }
  const u = parseUrl(url);
  if (!u || !/^https?:$/.test(u.protocol)) return null;
  const labels = u.hostname.toLowerCase().split('.').filter(Boolean);
  if (labels.length > 1 && !/^[\d]+$/.test(labels[0])) labels.pop(); // зона верхнего уровня
  const sld = labels[labels.length - 1];
  // поддомены больших сервисов: drive.google.com -> google-drive
  if (labels.length >= 2) {
    const sub = labels[labels.length - 2];
    const r = idx.byNorm.get(norm(sld + sub)) || (sub === 'mail' && sld === 'google' ? lookupName('gmail') : null);
    if (r) return r;
  }
  for (const lab of labels) {
    for (const part of [lab, ...lab.split('-')]) {
      if (STOP.has(part)) continue;
      const r = lookupName(part);
      if (r) return r;
    }
  }
  // 1panelpve -> 1panel: самый длинный известный префикс
  for (const lab of labels) {
    if (lab.length < 5) continue;
    for (let n = lab.length - 1; n >= 4; n--) {
      const r = idx.byNorm.get(norm(lab.slice(0, n)));
      if (r) return r;
    }
  }
  const port = +u.port;
  if (port && PORTS[port]) return idx.byNorm.get(norm(PORTS[port])) || null;
  return null;
}
function prettyName(slug) {
  const SPECIAL = { 'pi-hole': 'Pi-hole', 'home-assistant': 'Home Assistant', 'adguard-home': 'AdGuard Home', 'nginx-proxy-manager': 'Nginx Proxy Manager',
    'uptime-kuma': 'Uptime Kuma', qbittorrent: 'qBittorrent', 'paperless-ngx': 'Paperless-ngx', 'synology-dsm': 'Synology DSM', unifi: 'UniFi',
    youtube: 'YouTube', github: 'GitHub', gitlab: 'GitLab', truenas: 'TrueNAS', 'proxmox-backup-server': 'Proxmox Backup Server', x: 'X', n8n: 'n8n',
    chatgpt: 'ChatGPT', 'claude-ai': 'Claude', '1panel': '1Panel', influxdb: 'InfluxDB', nzbget: 'NZBGet', esphome: 'ESPHome', photoprism: 'PhotoPrism' };
  if (SPECIAL[slug]) return SPECIAL[slug];
  return slug.split('-').map((w) => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}
// название по адресу, когда сеть не помогла (локалки, IP, tailscale)
function titleFromUrl(url) {
  const app = guessApp(url, '');
  if (app) return prettyName(app.name);
  const u = parseUrl(url);
  if (!u) return url;
  if (!/^https?:$/.test(u.protocol)) return url.replace(/^[a-z]+:\/*/i, '').slice(0, 40);
  const host = u.hostname.replace(/^www\./, '');
  if (/^[\d.]+$/.test(host) || host.startsWith('[')) return host + (u.port ? ':' + u.port : '');
  const parts = host.split('.');
  let main = parts[0];
  if (parts.length > 2 && !isLocalHost(host) && !PLATFORMS.test(host)) {
    // wre.pp.ua, site.co.uk — короткая зона второго уровня
    const i = parts.length - 2;
    main = parts[i].length <= 3 && parts[i + 1].length === 2 ? parts[i - 1] : parts[i];
  }
  return main.charAt(0).toUpperCase() + main.slice(1);
}

// список кандидатов для <img>: свой выбор -> узнанный сервис -> иконки сайта -> буква
function iconCandidates(link) {
  const out = [];
  const ic = link.icon || '';
  if (ic.startsWith('txt:')) return out; // эмодзи/буква
  if (ic) {
    const rec = iconFromRef(ic);
    out.push(rec ? iconRecUrl(rec) : ic);
    if (rec && rec.light) out.push(iconRecUrl({ ...rec, light: false }));
    return out;
  }
  const app = guessApp(link.url, link.title);
  if (app) {
    out.push(iconRecUrl(app));
    if (app.light) out.push(iconRecUrl({ ...app, light: false }));
  }
  const u = parseUrl(link.url);
  if (u && /^https?:$/.test(u.protocol)) {
    const local = isLocalHost(u.hostname);
    out.push(u.origin + '/apple-touch-icon.png');
    if (link.fav && !link.fav.startsWith('chrome')) out.push(link.fav);
    if (!local) out.push(`https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`);
    out.push(u.origin + '/favicon.ico');
    if (!local) out.push(`https://icons.duckduckgo.com/ip3/${u.hostname}.ico`);
  }
  return out;
}
function letterOf(title) {
  const s = (title || '?').trim();
  const ch = Array.from(s)[0] || '?';
  return ch.toUpperCase();
}
function hueOf(s) { let h = 0; for (const c of s || '') h = (h * 31 + c.charCodeAt(0)) % 360; return h; }

// автоназвание + описание через microlink (работает для публичных сайтов)
const JUNK = [/attention required/i, /just a moment/i, /checking your browser/i, /verify you are/i, /access denied/i, /forbidden/i,
  /captcha/i, /enable javascript/i, /cloudflare/i, /^40\d\b/, /not found/i, /^error/i, /sign in/i, /log ?in/i];
function cleanTitle(s, url) {
  s = (s || '').replace(/\s+/g, ' ').replace(/^\(\d+\+?\)\s*/, '').trim();
  if (!s || JUNK.some((r) => r.test(s))) return '';
  // «Inbox (3) - me@gmail.com - Gmail» -> Gmail; «GitHub - user/repo: описание» -> user/repo
  const parts = s.split(/\s+[|–—·•-]\s+/).map((x) => x.trim()).filter(Boolean);
  if (parts.length > 1) {
    const u = parseUrl(url);
    const host = norm((u || {}).hostname || '');
    const isBrand = (p) => p.length > 1 && host.includes(norm(p));
    const brand = parts.find(isBrand);
    const rest = parts.filter((p) => !isBrand(p) && !p.includes('@') && !/^(inbox|входящие|home|главная|dashboard|log ?in)\b/i.test(p));
    const root = !u || u.pathname.replace(/\/+$/, '') === '';
    if (brand && (root || !rest.length)) s = brand;
    else if (rest.length) s = rest[0];
    else s = parts[parts.length - 1].length <= 24 ? parts[parts.length - 1] : parts[0];
  }
  if (s.length > 40 && s.includes(': ')) s = s.split(': ')[0]; // «user/repo: длинное описание»
  return s.length > 48 ? s.slice(0, 46) + '…' : s;
}
async function fetchMeta(url, signal) {
  const u = parseUrl(url);
  if (!u || !/^https?:$/.test(u.protocol) || isLocalHost(u.hostname)) return null;
  try {
    const r = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, { signal });
    const j = await r.json();
    if (j.status !== 'success' || !j.data) return null;
    const desc = (j.data.description || '').replace(/\s+/g, ' ').trim();
    return { title: cleanTitle(j.data.title || j.data.publisher, url), desc: desc.length > 90 ? desc.slice(0, 88) + '…' : desc };
  } catch { return null; }
}

// ---------- модель ----------
const ACCENTS = ['#7c8cff', '#5ec2b7', '#f2a65a', '#ef6f88', '#a78bfa', '#7fbf6a', '#e6e6e6'];
const BG_PRESETS = [
  'linear-gradient(135deg,#0f2027,#203a43,#2c5364)', 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
  'linear-gradient(135deg,#232526,#414345)', 'linear-gradient(135deg,#2b1055,#7597de)', 'linear-gradient(135deg,#134e5e,#71b280)', '#0d1117', '#16161d',
];
const CURATED = [
  '1506905925346-21bda4d32df4', '1469474968028-56623f02e42e', '1447752875215-b2761acb3c5d', '1507525428034-b723cf961d3e',
  '1519681393784-d120267933ba', '1470071459604-3b5ec3a7fe05', '1501785888041-af3ef285b470', '1518837695005-2083093ee35b',
  '1500530855697-b586d89ba3ee', '1493246507139-91e8fad9978e', '1464822759023-fed622ff2c3b', '1454496522488-7a8e488e8606',
].map((id) => `https://images.unsplash.com/photo-${id}?q=80&w=1920&auto=format&fit=crop`);

function defaultSettings() {
  return {
    lang: 'auto', name: '', showClock: true, showSearch: true, showDesc: true,
    accent: ACCENTS[0], density: 'comfortable', maxw: 'normal', cols: 0,
    engine: 'google', engineCustom: '', newTab: false, lock: false, sync: true,
    bg: { mode: 'curated', blur: 0, dim: 30, interval: 1440, index: Math.floor(Math.random() * CURATED.length), lastChange: 0, urls: [], color: BG_PRESETS[0] },
  };
}
function defaultState() {
  setLang('auto');
  const ru = (curLang || detectLang()) === 'ru';
  return {
    v: 2, ts: Date.now(), settings: defaultSettings(),
    groups: [
      { id: uid(), kind: 'links', title: 'Homelab', view: 'list', span: 1, items: [
        { id: uid(), title: 'Proxmox', url: 'https://192.168.1.2:8006', desc: ru ? 'Гипервизор' : 'Hypervisor' },
        { id: uid(), title: 'Home Assistant', url: 'http://192.168.1.3:8123', desc: ru ? 'Умный дом' : 'Smart home' },
        { id: uid(), title: 'Jellyfin', url: 'http://192.168.1.4:8096', desc: ru ? 'Медиасервер' : 'Media server' },
      ] },
      { id: uid(), kind: 'links', title: ru ? 'Закладки' : 'Bookmarks', view: 'tiles', span: 1, items: [
        { id: uid(), title: 'YouTube', url: 'https://www.youtube.com/' },
        { id: uid(), title: 'GitHub', url: 'https://github.com/' },
        { id: uid(), title: 'Gmail', url: 'https://mail.google.com/' },
        { id: uid(), title: 'Reddit', url: 'https://www.reddit.com/' },
      ] },
      { id: uid(), kind: 'weather', title: ru ? 'Погода' : 'Weather', span: 1, city: ru ? 'Москва' : 'London', days: 4, hours: 0 },
    ],
  };
}
function newGroup(kind, title) {
  const g = { id: uid(), kind, title: title || '', span: 1 };
  if (kind === 'links') { g.view = 'tiles'; g.items = []; }
  if (kind === 'note') g.text = '';
  if (kind === 'todo') g.items = [];
  if (kind === 'weather') { g.city = ''; g.days = 4; g.hours = 0; }
  if (kind === 'currency') { g.base = 'USD'; g.symbols = ['EUR', 'GBP']; }
  if (kind === 'crypto') g.coins = ['BTC', 'ETH', 'SOL'];
  if (kind === 'clock') g.zones = ['Europe/London', 'America/New_York', 'Asia/Tokyo'];
  if (kind === 'countdown') g.events = [];
  if (kind === 'rss') { g.feed = ''; g.count = 6; }
  if (kind === 'iframe') { g.url = ''; g.height = 320; }
  if (kind === 'github') g.repos = ['immich-app/immich', 'home-assistant/core', 'jellyfin/jellyfin'];
  if (kind === 'topsites') g.count = 8;
  return g;
}
const KINDS = ['links', 'note', 'todo', 'weather', 'currency', 'crypto', 'clock', 'calendar', 'countdown', 'rss', 'iframe', 'github', 'topsites'];
const WIDGETS = KINDS.slice(1);
// приводим любое состояние к рабочему виду (защита от кривого импорта)
function sanitize(s) {
  if (!s || typeof s !== 'object' || !Array.isArray(s.groups)) return null;
  const d = defaultSettings();
  s.v = 2;
  s.ts = +s.ts || Date.now();
  s.settings = Object.assign(d, s.settings || {});
  s.settings.bg = Object.assign(defaultSettings().bg, (s.settings && s.settings.bg) || {});
  s.groups = s.groups.filter((g) => g && KINDS.includes(g.kind)).map((g) => {
    const base = newGroup(g.kind);
    const out = Object.assign(base, g);
    out.id = out.id || uid();
    out.span = clamp(+out.span || 1, 1, 4);
    if (out.kind === 'links') {
      out.items = (Array.isArray(out.items) ? out.items : []).filter((l) => l && l.url).map((l) => ({
        id: l.id || uid(), title: String(l.title || titleFromUrl(l.url)), url: String(l.url),
        ...(l.desc ? { desc: String(l.desc) } : {}), ...(l.icon ? { icon: String(l.icon) } : {}), ...(l.fav ? { fav: String(l.fav) } : {}),
      }));
      if (!['tiles', 'list', 'compact'].includes(out.view)) out.view = 'tiles';
    }
    if (out.kind === 'todo') out.items = (Array.isArray(out.items) ? out.items : []).map((x) => ({ id: x.id || uid(), text: String(x.text || ''), done: !!x.done }));
    return out;
  });
  return s;
}

// миграция со старого R.Db (свободная доска board: папки, ссылки, виджеты)
function migrateV1(old) {
  if (!old || !Array.isArray(old.board || old.tree)) return null;
  const s = { v: 2, ts: Date.now(), settings: defaultSettings(), groups: [] };
  const os = old.settings || {};
  if (os.lang === 'ru' || os.lang === 'en') s.settings.lang = os.lang;
  else if (os.lang === 'uk') s.settings.lang = 'ru';
  s.settings.showClock = os.showClock !== false;
  if (os.bg) {
    const b = os.bg;
    s.settings.bg = Object.assign(s.settings.bg, {
      mode: { curated: 'curated', custom: 'custom', upload: 'upload', gradient: 'color', color: 'color' }[b.mode] || 'curated',
      blur: clamp(+b.blur || 0, 0, 20), dim: clamp(+b.dim || 0, 0, 80), urls: b.customUrls || [], color: b.color || BG_PRESETS[0],
      interval: b.intervalMin === 0 ? 0 : (b.intervalMin >= 1440 ? 1440 : b.intervalMin >= 60 ? 60 : 15),
    });
  }
  setLang(s.settings.lang);
  // по порядку на доске: сверху вниз, слева направо
  const board = (old.board || old.tree || []).slice().sort((a, b) => ((a.fy || 0) - (b.fy || 0)) || ((a.fx || 0) - (b.fx || 0)));
  const toLink = (it) => ({ id: it.id || uid(), title: it.title || titleFromUrl(it.url), url: normalizeUrl(it.url), ...(it.icon ? { icon: it.icon } : {}) });
  const loose = { id: uid(), kind: 'links', title: t('bookmarks'), view: 'tiles', span: 1, items: [] };
  const folderToGroups = (f, prefix) => {
    const g = { id: f.id || uid(), kind: 'links', title: (prefix ? prefix + ' / ' : '') + (f.title || t('untitled')), view: 'list', span: 1, items: [] };
    const subs = [];
    (f.children || []).forEach((c) => { if (c.type === 'folder') subs.push(c); else if (c.url) g.items.push(toLink(c)); });
    g.view = g.items.length > 6 ? 'compact' : 'list';
    const res = [g];
    subs.forEach((sf) => res.push(...folderToGroups(sf, g.title)));
    return res.filter((x) => x.items.length || !subs.length);
  };
  let looseAt = -1;
  board.forEach((w) => {
    if (w.type === 'folder') s.groups.push(...folderToGroups(w, ''));
    else if (w.type === 'link' && w.url) { if (looseAt < 0) { looseAt = s.groups.length; s.groups.push(loose); } loose.items.push(toLink(w)); }
    else if (w.type === 'note') s.groups.push({ id: w.id || uid(), kind: 'note', title: w.title || t('kNote'), text: w.text || '', span: 1 });
    else if (w.type === 'checklist') s.groups.push({ id: w.id || uid(), kind: 'todo', title: w.title || t('kTodo'), span: 1,
      items: (w.items || []).map((x) => ({ id: x.id || uid(), text: x.text || '', done: !!x.done })) });
    else if (w.type === 'weather' || w.type === 'forecast') s.groups.push({ id: w.id || uid(), kind: 'weather', title: w.title || t('kWeather'), span: 1,
      city: w.city || '', days: clamp(+w.days || (w.type === 'forecast' ? 3 : 0), 0, 7), hours: clamp(+w.hours || 0, 0, 24) });
    else if (w.type === 'currency') s.groups.push({ id: w.id || uid(), kind: 'currency', title: w.title || t('kCurrency'), span: 1,
      base: w.base || 'USD', symbols: Array.isArray(w.symbols) && w.symbols.length ? w.symbols : ['EUR'] });
    else if (w.type === 'crypto') s.groups.push({ id: w.id || uid(), kind: 'crypto', title: w.title || t('kCrypto'), span: 1, coins: w.coins || ['BTC', 'ETH'] });
  });
  return sanitize(s);
}

// ---------- хранилище ----------
// local: полное состояние; sync: то же, порезанное на куски (квота ~100 КБ, ~8 КБ на ключ)
const KEY = 'rdb2', SYNC_PREFIX = 'rdb2_', SYNC_CHUNK = 6000, INBOX = 'rdb2_inbox', BG_UPLOAD = 'rdb2_bgfile';
const OLD_LS = 'browser-desktop-v1', OLD_SYNC = 'rdb_';
const area = (name) => (ext && ext.storage && ext.storage[name]) || null;
async function aget(name, keys) {
  const a = area(name);
  if (!a) return {};
  try { return (await a.get(keys)) || {}; } catch { return {}; }
}
async function aset(name, obj) { const a = area(name); if (a) await a.set(obj); }
async function aremove(name, keys) { const a = area(name); if (a) { try { await a.remove(keys); } catch {} } }

async function readSyncChunks(prefix) {
  const m = await aget('sync', prefix + 'meta');
  const meta = m[prefix + 'meta'];
  if (!meta || !meta.n) return null;
  const keys = Array.from({ length: meta.n }, (_, i) => prefix + 'c' + i);
  const parts = await aget('sync', keys);
  let str = '';
  for (const k of keys) { if (typeof parts[k] !== 'string') return null; str += parts[k]; }
  try { return JSON.parse(str); } catch { return null; }
}
const store = {
  async load() {
    let local = (await aget('local', KEY))[KEY] || null;
    if (!local && !area('local')) { try { local = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {} }
    let synced = null;
    if (!local || local.settings?.sync !== false) synced = await readSyncChunks(SYNC_PREFIX);
    let s = (synced && (!local || (+synced.ts || 0) > (+local.ts || 0))) ? synced : local;
    let migrated = false;
    if (!s) {
      let old = await readSyncChunks(OLD_SYNC);
      if (!old) { const o = await aget('sync', 'state'); old = o.state || null; }
      if (!old) { try { old = JSON.parse(G.localStorage?.getItem(OLD_LS) || 'null'); } catch {} }
      s = migrateV1(old);
      migrated = !!s;
    }
    s = sanitize(s) || defaultState();
    setLang(s.settings.lang);
    return { state: s, migrated };
  },
  async save(s, { touch = true } = {}) {
    if (touch) s.ts = Date.now();
    if (area('local')) await aset('local', { [KEY]: s });
    else { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
    // в sync пишем реже: у браузера лимит ~120 записей в минуту
    clearTimeout(this._st);
    if (s.settings.sync) this._st = setTimeout(() => this.flushSync(s), 3000);
    this._pending = s.settings.sync ? s : null;
  },
  async flushSync(s = this._pending) {
    clearTimeout(this._st);
    this._pending = null;
    if (!s || !s.settings.sync) return;
    try { await this.saveSync(JSON.stringify(s), s.ts); } catch (e) { console.warn('sync', e); }
  },
  async saveSync(json, ts) {
    if (!area('sync')) return;
    // лимит sync: ~8 КБ на ключ с учётом экранирования, ~100 КБ всего
    const chunks = [];
    let i = 0;
    while (i < json.length) {
      let n = Math.min(SYNC_CHUNK, json.length - i);
      while (JSON.stringify(json.substr(i, n)).length > 7600) n = Math.floor(n * 0.85);
      chunks.push(json.substr(i, n));
      i += n;
    }
    if (chunks.length > 12) return; // не влезает — остаётся локально
    const old = (await aget('sync', SYNC_PREFIX + 'meta'))[SYNC_PREFIX + 'meta'];
    const obj = {};
    chunks.forEach((c, k) => { obj[SYNC_PREFIX + 'c' + k] = c; });
    obj[SYNC_PREFIX + 'meta'] = { n: chunks.length, ts };
    await aset('sync', obj);
    const stale = [];
    for (let k = chunks.length; k < ((old && old.n) || 0); k++) stale.push(SYNC_PREFIX + 'c' + k);
    if (stale.length) await aremove('sync', stale);
  },
  // после переноса старые ключи R.Db 1.x только занимают квоту sync
  async cleanupOld() {
    const all = await aget('sync', null);
    const keys = Object.keys(all).filter((k) => k === 'state' || k.startsWith(OLD_SYNC));
    if (keys.length) await aremove('sync', keys);
  },
  // быстрые добавления из попапа/контекстного меню копятся тут, вкладка забирает их в состояние
  async pushInbox(item) {
    const cur = (await aget('local', INBOX))[INBOX] || [];
    cur.push({ ...item, id: uid(), at: Date.now() });
    await aset('local', { [INBOX]: cur });
  },
  async takeInbox() {
    const cur = (await aget('local', INBOX))[INBOX] || [];
    if (cur.length) await aremove('local', INBOX);
    return cur;
  },
  async getBgFile() { return (await aget('local', BG_UPLOAD))[BG_UPLOAD] || ''; },
  async setBgFile(v) { if (v) await aset('local', { [BG_UPLOAD]: v }); else await aremove('local', BG_UPLOAD); },
  keys: { KEY, SYNC_PREFIX, INBOX, BG_UPLOAD },
};

G.RDB = {
  ext, uid, clamp, norm, normalizeUrl, parseUrl, isLocalHost, t, setLang, lang: () => curLang || detectLang(),
  iconIndex, iconRecUrl, iconRef, iconFromRef, searchIcons, guessApp, prettyName, titleFromUrl, iconCandidates, letterOf, hueOf,
  cleanTitle, fetchMeta, ACCENTS, BG_PRESETS, CURATED, defaultState, newGroup, sanitize, migrateV1, store, KINDS, WIDGETS,
};
})(typeof globalThis !== 'undefined' ? globalThis : self);
