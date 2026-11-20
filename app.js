// R.Db — новая вкладка. Группы закладок и виджеты в сетке, поиск, быстрые добавления.
'use strict';
const R = window.RDB;
const { t, uid, clamp, store, ext } = R;
const $ = (s, el = document) => el.querySelector(s);

let state = null;
let cols = 3;
const busyMeta = new Set(); // ссылки, для которых сейчас тянем название

// ---------- мелочи ----------
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && k !== 'list' && k !== 'form') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
const ICON = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  group: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  widget: '<path d="M4 15a5 5 0 0 1 4.5-5A6 6 0 0 1 20 12a4 4 0 0 1-1 7.9H8a4 4 0 0 1-4-4.9z"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  ext: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  move: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  tiles: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  compact: '<path d="M3 6h7M14 6h7M3 12h7M14 12h7M3 18h7M14 18h7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  frame: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6v2M12 16v2"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  play: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 9 5 3-5 3z"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
};
const svg = (name, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[name] || ''}</svg>`;
const ic = (name) => h('span', { class: 'ico', html: svg(name) });

let saveTimer = 0;
function save(rerender = true) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.save(state), 250);
  state.ts = Date.now();
  if (rerender) render();
}
function findGroup(id) { return state.groups.find((g) => g.id === id); }
function findLink(id) {
  for (const g of state.groups) if (g.kind === 'links') { const i = g.items.findIndex((l) => l.id === id); if (i >= 0) return { g, i, l: g.items[i] }; }
  return null;
}
function linkGroups() { const l = state.groups.filter((g) => g.kind === 'links'); return [...l.filter(onBoard), ...l.filter((g) => !onBoard(g))]; }
function ensureLinkGroup(preferId) {
  const g = (preferId && findGroup(preferId)) || linkGroups()[0];
  if (g && g.kind === 'links') return g;
  const ng = R.newGroup('links', t('inbox'));
  ng.board = curBoard();
  state.groups.unshift(ng);
  return ng;
}
function kindIcon(kind) {
  return { links: 'link', note: 'note', todo: 'check', weather: 'widget', currency: 'cash', crypto: 'coin', clock: 'clock', calendar: 'cal',
    countdown: 'timer', rss: 'rss', iframe: 'frame', github: 'tag', topsites: 'star', server: 'server' }[kind] || 'group';
}
const kName = (k) => t('k' + k[0].toUpperCase() + k.slice(1));

// кэш для виджетов и иконок — только на этом устройстве, не синхронизируется
const cache = (() => {
  let c = {};
  try { c = JSON.parse(localStorage.getItem('rdb2_cache') || '{}') || {}; } catch {}
  c.icon = c.icon || {}; c.wx = c.wx || {}; c.geo = c.geo || {}; c.cr = c.cr || {};
  delete c.fx; delete c.fxHist; // старый формат курсов (до 2.2)
  let tm = 0;
  return { c, save() { clearTimeout(tm); tm = setTimeout(() => { try { localStorage.setItem('rdb2_cache', JSON.stringify(c)); } catch {} }, 400); } };
})();

// ---------- иконки ----------
function iconKey(l) { return (l.icon || '') + '|' + l.url + '|' + l.title; }
function iconBox(l, cls = 'ic') {
  const box = h('span', { class: cls });
  const txt = (l.icon || '').startsWith('txt:') ? l.icon.slice(4) : '';
  const letter = h('span', { class: 'ic-letter', text: txt || R.letterOf(l.title) });
  if (!txt) box.style.setProperty('--h', R.hueOf(l.title || l.url));
  else box.classList.add('ic-emoji');
  box.append(letter);
  if (txt) return box;
  let urls = R.iconCandidates(l);
  const key = iconKey(l);
  const hit = cache.c.icon[key];
  if (hit === '') return box; // уже знаем: картинки нет, только буква
  if (hit) urls = [hit, ...urls.filter((u) => u !== hit)];
  if (!urls.length) return box;
  const img = h('img', { alt: '', draggable: false, decoding: 'async', referrerPolicy: 'no-referrer' });
  let i = 0;
  const next = () => {
    i++;
    if (i < urls.length) img.src = urls[i];
    else { img.remove(); if (navigator.onLine) { cache.c.icon[key] = ''; cache.save(); } }
  };
  img.onload = () => {
    // гугл отдаёт серый глобус 16px, если иконки нет — считаем это промахом
    if (/google\.com\/s2|duckduckgo/.test(img.src) && img.naturalWidth < 24) return next();
    if (img.naturalWidth < 2) return next();
    box.classList.add('has-img');
    if (cache.c.icon[key] !== urls[i]) { cache.c.icon[key] = urls[i]; trimIconCache(); cache.save(); }
  };
  img.onerror = next;
  img.src = urls[0];
  box.append(img);
  return box;
}
function trimIconCache() {
  const k = Object.keys(cache.c.icon);
  if (k.length > 800) k.slice(0, k.length - 800).forEach((x) => delete cache.c.icon[x]);
}

// ---------- фон ----------
let bgShowA = true, bgTimer = 0;
const bgLocal = (() => { try { return JSON.parse(localStorage.getItem('rdb2_bg') || '{}') || {}; } catch { return {}; } })();
function bgLocalSave() { try { localStorage.setItem('rdb2_bg', JSON.stringify(bgLocal)); } catch {} }
function bgUrls() {
  const b = state.settings.bg;
  if (b.mode === 'custom') { const u = (b.urls || []).map((s) => s.trim()).filter(Boolean); return u.length ? u : R.CURATED; }
  return R.CURATED;
}
async function showBg(force) {
  const b = state.settings.bg;
  $('#dim').style.background = `rgba(${themeNow() === 'light' ? '236,239,245' : '6,8,12'},${b.dim / 100})`;
  document.documentElement.style.setProperty('--bg-blur', b.blur + 'px');
  const credit = $('#credit');
  credit.hidden = true;
  if (b.mode === 'color') return paintBg(b.color || R.BG_PRESETS[0], false);
  if (b.mode === 'upload') { const f = await store.getBgFile(); return paintBg(f ? `url("${f}")` : R.BG_PRESETS[0], !!f); }
  const list = bgUrls();
  const iv = +b.interval;
  const due = force || iv === 0 || (iv > 0 && Date.now() - (bgLocal.last || 0) > iv * 60e3);
  let url = bgLocal.url;
  if (!url || !list.includes(url) || (due && (bgLocal.last || force || iv === 0))) {
    // случайное фото, но не из недавно показанных: помним последнюю половину подборки
    const recent = (bgLocal.recent || []).filter((u) => list.includes(u));
    const others = list.filter((u) => u !== url);
    const unseen = others.filter((u) => !recent.includes(u));
    const pick = unseen.length ? unseen : others.length ? others : list;
    url = pick[Math.floor(Math.random() * pick.length)];
    bgLocal.recent = [url, ...recent].slice(0, Math.floor(list.length / 2));
    bgLocal.url = url;
    delete bgLocal.index;
  }
  if (due) { bgLocal.last = Date.now(); bgLocalSave(); }
  else bgLocalSave();
  if (b.mode === 'curated') {
    credit.hidden = false;
    credit.textContent = `${t('photo')}: Unsplash`;
    credit.href = url.split('?')[0].replace('images.unsplash.com/photo-', 'unsplash.com/photos/');
  }
  // предзагрузка, чтобы фото не проявлялось полосами
  const pre = new Image();
  pre.onload = () => paintBg(`url("${url}")`, true);
  pre.onerror = () => paintBg(R.BG_PRESETS[0], false);
  pre.src = url;
  clearTimeout(bgTimer);
  if (iv > 0 && iv < 1440) bgTimer = setTimeout(() => showBg(true), iv * 60e3);
}
function paintBg(css, isImg) {
  const a = $('#bgA'), b = $('#bgB');
  const [show, hide] = bgShowA ? [b, a] : [a, b];
  const put = (el) => { el.style.background = isImg ? '' : css; if (isImg) el.style.backgroundImage = css; };
  if (document.body.classList.contains('booting')) { // первый кадр — без анимации
    put(a); a.classList.add('on'); b.classList.remove('on'); bgShowA = true; return;
  }
  put(show);
  show.classList.add('on'); hide.classList.remove('on');
  bgShowA = !bgShowA;
}
function fileToDataUrl(file, maxDim = 1920, q = 0.86) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = rej;
    fr.onload = () => {
      if (file.type === 'image/svg+xml') return res(fr.result);
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const k = Math.min(1, maxDim / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(maxDim <= 256 ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', q));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

// ---------- шапка ----------
const hour12 = (() => { try { return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12; } catch { return false; } })();
let lastDay = new Date().toDateString();
function tick() {
  const now = new Date();
  if (state && now.toDateString() !== lastDay) { lastDay = now.toDateString(); render(); }
  state && state.groups.forEach((g) => { if (g.kind === 'clock' && !g.collapsed) { const el = $(`.w-load[data-wid="${g.id}"]`); if (el) wClock(g, el); } });
  const loc = R.lang() === 'ru' ? 'ru-RU' : undefined;
  $('#clock').textContent = now.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12 });
  const hr = now.getHours();
  const greet = t(hr < 5 ? 'night' : hr < 12 ? 'morning' : hr < 18 ? 'day' : hr < 23 ? 'evening' : 'night');
  const date = now.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' });
  const name = (state.settings.name || '').trim();
  $('#hello').textContent = `${date[0].toUpperCase() + date.slice(1)} · ${greet}${name ? ', ' + name : ''}`;
}

// ---------- раскладка ----------
// тема: тёмная, светлая или как в системе
const darkMQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function themeNow() {
  const th = (state && state.settings.theme) || 'dark';
  return th === 'auto' ? (darkMQ && !darkMQ.matches ? 'light' : 'dark') : th;
}
if (darkMQ) darkMQ.addEventListener('change', () => { if (state && state.settings.theme === 'auto') { applySettings(); showBgFilters(); } });
function applySettings() {
  const s = state.settings;
  document.documentElement.dataset.theme = themeNow();
  R.setLang(s.lang);
  document.documentElement.lang = R.lang();
  const root = document.documentElement.style;
  root.setProperty('--accent', s.accent);
  document.body.dataset.density = s.density;
  document.body.dataset.maxw = s.maxw;
  document.body.classList.toggle('locked', !!s.lock);
  document.body.classList.toggle('no-desc', !s.showDesc);
  $('#clockWrap').hidden = !s.showClock;
  $('#searchWrap').hidden = !s.showSearch;
  $('#top').hidden = !s.showClock;
  $('#search').placeholder = t('search');
  $('#searchIc').innerHTML = svg('search');
  $('#addBtn').innerHTML = svg('plus'); $('#addBtn').title = t('add');
  $('#settingsBtn').innerHTML = svg('gear'); $('#settingsBtn').title = t('settings');
  $('#emptyTitle').textContent = t('emptyBoard');
  $('#emptyHint').textContent = t('emptyHint');
}
function computeCols() {
  const w = $('#grid').clientWidth || window.innerWidth;
  const auto = clamp(Math.floor((w + 16) / (state.settings.density === 'compact' ? 270 : 310)), 1, 6);
  cols = state.settings.cols ? Math.min(state.settings.cols, Math.max(1, Math.floor((w + 16) / 200))) : auto;
  $('#grid').style.setProperty('--cols', cols);
}
// упаковка в стиле masonry: строки по 4px, каждая карточка занимает столько, сколько её высота
const ROW = 4, GAP = 16;
function packCard(card) {
  const inner = card.firstElementChild;
  if (!inner) return;
  const hgt = inner.getBoundingClientRect().height;
  card.style.gridRowEnd = 'span ' + Math.max(1, Math.ceil((hgt + GAP) / ROW));
}
const ro = new ResizeObserver((entries) => entries.forEach((e) => packCard(e.target.parentElement)));
window.addEventListener('resize', () => { const c = cols; computeCols(); if (c !== cols) render(); });

function render() {
  const grid = $('#grid');
  ro.disconnect();
  clearLive();
  computeCols();
  renderBoards();
  const vis = visibleGroups();
  grid.replaceChildren(...vis.map(groupEl));
  grid.querySelectorAll('.card').forEach((c) => { packCard(c); ro.observe(c.firstElementChild); });
  $('#emptyBoard').hidden = vis.length > 0;
  loadWidgets();
  paintPings();
}

// ---------- группы ----------
function groupEl(g) {
  const span = g.span >= 4 ? cols : Math.min(g.span || 1, cols);
  const card = h('section', { class: `card k-${g.kind}` + (g.collapsed ? ' collapsed' : ''), 'data-gid': g.id, style: { gridColumn: `span ${span}` } });
  const inner = h('div', { class: 'card-in' });
  const head = h('header', { class: 'card-head' },
    h('button', { class: 'card-title', text: g.title || t('k' + g.kind[0].toUpperCase() + g.kind.slice(1)), title: g.collapsed ? t('expand') : t('collapse'),
      onclick: () => { g.collapsed = !g.collapsed; save(); } }),
    h('span', { class: 'card-tools' },
      g.kind === 'links' ? h('button', { class: 'tool', title: t('addLink'), html: svg('plus'), onclick: () => openLinkDialog({ groupId: g.id }) }) : null,
      h('button', { class: 'tool', title: t('edit'), html: svg('dots'), onclick: (e) => openMenu(e.currentTarget, groupMenu(g)) })));
  head.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); openMenuAt(e.clientX, e.clientY, groupMenu(g)); });
  head.addEventListener('pointerdown', (e) => startGroupDrag(e, card));
  const body = h('div', { class: 'card-body' });
  if (!g.collapsed) {
    if (g.kind === 'links') linksBody(g, body);
    else if (g.kind === 'note') noteBody(g, body);
    else if (g.kind === 'todo') todoBody(g, body);
    else body.append(h('div', { class: 'w-load', 'data-wid': g.id }, h('span', { class: 'spinner' })));
  }
  inner.append(head, body);
  if (!state.settings.lock) {
    const grip = h('span', { class: 'card-resize', title: t('resize') });
    grip.addEventListener('pointerdown', (e) => startResize(e, g, card));
    inner.append(grip);
  }
  card.append(inner);
  card.addEventListener('dragover', (e) => onDragOver(e, g, card));
  card.addEventListener('dragleave', (e) => { if (!card.contains(e.relatedTarget)) clearDrop(); });
  card.addEventListener('drop', (e) => onDrop(e, g, card));
  return card;
}
function groupMenu(g) {
  const i = state.groups.indexOf(g);
  const items = [];
  if (g.kind === 'links') {
    items.push({ icon: 'plus', label: t('addLink'), run: () => openLinkDialog({ groupId: g.id }) });
    items.push({ sep: true });
    items.push({ icon: 'tiles', label: t('vTiles'), checked: g.view === 'tiles', run: () => { g.view = 'tiles'; save(); } });
    items.push({ icon: 'list', label: t('vList'), checked: g.view === 'list', run: () => { g.view = 'list'; save(); } });
    items.push({ icon: 'compact', label: t('vCompact'), checked: g.view === 'compact', run: () => { g.view = 'compact'; save(); } });
    items.push({ sep: true });
  }
  items.push({ icon: 'edit', label: t('edit'), run: () => openGroupDialog({ group: g }) });
  const vis = visibleGroups(), vi = vis.indexOf(g);
  const swap = (o) => { const j = state.groups.indexOf(o); state.groups[i] = o; state.groups[j] = g; save(); };
  if (vi > 0) items.push({ icon: 'up', label: t('moveUp'), run: () => swap(vis[vi - 1]) });
  if (vi >= 0 && vi < vis.length - 1) items.push({ icon: 'down', label: t('moveDown'), run: () => swap(vis[vi + 1]) });
  const others = state.boards.filter((b) => b.id !== g.board);
  if (others.length) items.push({ icon: 'move', label: t('toBoard'), sub: others.map((b) => ({ label: boardName(b), run: () => moveGroupToBoard(g, b.id) })) });
  items.push({ icon: 'trash', label: t('del'), danger: true, run: () => removeGroup(g) });
  return items;
}
function removeGroup(g) {
  const i = state.groups.indexOf(g);
  if (i < 0) return;
  state.groups.splice(i, 1);
  save();
  if (['iframe', 'server'].includes(g.kind)) setTimeout(() => { if (!state.groups.includes(g)) syncFrameRules(); }, 6000); // после окна «Отменить»
  toast(t('deleted') + ': ' + (g.title || t('k' + g.kind[0].toUpperCase() + g.kind.slice(1))), t('undo'), () => { state.groups.splice(i, 0, g); save(); });
}

// ---------- закладки ----------
function linksBody(g, body) {
  const list = h('div', { class: 'links v-' + g.view });
  g.items.forEach((l) => list.append(linkEl(l, g)));
  if (!g.items.length) list.append(h('button', { class: 'links-empty', text: t('emptyGroup'), onclick: () => openLinkDialog({ groupId: g.id }) }));
  body.append(list);
}
function linkEl(l, g) {
  const a = h('a', { class: 'lnk', href: l.url, 'data-lid': l.id, draggable: !state.settings.lock, title: l.url });
  if (state.settings.newTab) { a.target = '_blank'; a.rel = 'noopener'; }
  const pu = pingUrlOf(l);
  if (pu) { a.append(h('span', { class: 'ic-wrap' }, iconBox(l), h('span', { class: 'ping', 'data-purl': pu }))); a.dataset.purl = pu; }
  else a.append(iconBox(l));
  const txt = h('span', { class: 'lnk-txt' }, h('span', { class: 'lnk-title', text: l.title }));
  if (l.desc && g.view === 'list') txt.append(h('span', { class: 'lnk-desc', text: l.desc }));
  a.append(txt);
  if (busyMeta.has(l.id)) a.classList.add('loading');
  a.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); openMenuAt(e.clientX, e.clientY, linkMenu(l, g)); });
  a.addEventListener('dragstart', (e) => {
    if (state.settings.lock) return e.preventDefault();
    drag = { type: 'link', id: l.id };
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/uri-list', l.url);
    e.dataTransfer.setData('text/plain', l.url);
    e.dataTransfer.setData('text/x-rdb', l.id);
    requestAnimationFrame(() => a.classList.add('dragging'));
  });
  a.addEventListener('dragend', () => { a.classList.remove('dragging'); clearDrop(); drag = null; });
  return a;
}
function linkMenu(l, g) {
  const others = linkGroups().filter((x) => x !== g);
  return [
    { icon: 'ext', label: t('openNew'), run: () => window.open(l.url, '_blank', 'noopener') },
    { icon: 'edit', label: t('edit'), run: () => openLinkDialog({ link: l }) },
    { icon: 'copy', label: t('copy'), run: () => navigator.clipboard.writeText(l.url).catch(() => {}) },
    others.length ? { icon: 'move', label: t('moveTo'), sub: others.map((o) => ({ label: o.title || t('untitled'), run: () => moveLink(l.id, o.id) })) } : null,
    { sep: true },
    { icon: 'trash', label: t('del'), danger: true, run: () => removeLink(l.id) },
  ].filter(Boolean);
}
function moveLink(id, toGid, beforeId) {
  const f = findLink(id);
  const to = findGroup(toGid);
  if (!f || !to || to.kind !== 'links') return;
  f.g.items.splice(f.i, 1);
  let at = beforeId ? to.items.findIndex((x) => x.id === beforeId) : -1;
  if (at < 0) at = to.items.length;
  to.items.splice(at, 0, f.l);
  save();
}
function removeLink(id) {
  const f = findLink(id);
  if (!f) return;
  f.g.items.splice(f.i, 1);
  save();
  toast(t('deleted') + ': ' + f.l.title, t('undo'), () => { const g = findGroup(f.g.id); if (g) { g.items.splice(f.i, 0, f.l); save(); } });
}
// добавить ссылку «в один клик»: сразу кладём, название/описание подтягиваем следом
function quickAdd(url, groupId, extra = {}) {
  url = R.normalizeUrl(url);
  if (!url) return null;
  const g = ensureLinkGroup(groupId);
  const l = { id: uid(), url, title: (extra.title && R.cleanTitle(extra.title, url)) || R.titleFromUrl(url) };
  if (extra.fav && /^https?:/.test(extra.fav)) l.fav = extra.fav;
  g.items.push(l);
  save();
  enrich(l, !extra.title);
  return { l, g };
}
async function enrich(l, wantTitle) {
  const guessed = R.titleFromUrl(l.url);
  busyMeta.add(l.id);
  const m = await R.fetchMeta(l.url);
  busyMeta.delete(l.id);
  const f = findLink(l.id);
  if (!f) return;
  let changed = false;
  if (m && m.title && wantTitle && f.l.title === guessed && !R.guessApp(l.url, '')) { f.l.title = m.title; changed = true; }
  if (m && m.desc && !f.l.desc) { f.l.desc = m.desc; changed = true; }
  if (changed) save(); else render();
}

// ---------- пинг: живой ли сервер ----------
// fetch в режиме no-cors не требует доступа к сайту: ответ «непрозрачный», но если сервер ответил хоть чем-то — он жив.
// Отказ соединения, таймаут, не тот DNS или битый сертификат — fetch падает с ошибкой.
const PING_EVERY = 60e3, PING_TIMEOUT = 6000;
const pings = (() => { try { return JSON.parse(localStorage.getItem('rdb2_ping') || '{}') || {}; } catch { return {}; } })();
let pingTimer = 0, pingRun = null;
function pingUrlOf(l) { return R.pingTarget(l, state.settings); }
const pingOne = (url) => R.pingUrl(url, PING_TIMEOUT);
function pingLabel(p) {
  if (!p) return t('checking');
  if (p.s === 'up') return `${t('up')} · ${p.ms} ${R.lang() === 'ru' ? 'мс' : 'ms'}`;
  if (p.s === 'warn') return `${t('warn')}${p.code ? ' ' + p.code : ''}`;
  return t('down');
}
function paintPings() {
  document.querySelectorAll('.lnk[data-purl]').forEach((a) => {
    const p = pings[a.dataset.purl];
    const ok = p && Date.now() - p.t < 10 * 60e3;
    const dot = a.querySelector('.ping');
    if (dot) dot.dataset.s = ok ? p.s : 'wait';
    const txt = a.getAttribute('href') + '\n● ' + pingLabel(ok ? p : null);
    if (a.title !== txt) a.title = txt;
  });
  schedulePings();
}
async function runPings() {
  if (pingRun) return pingRun;
  pingRun = (async () => {
    const urls = Array.from(new Set(Array.from(document.querySelectorAll('.lnk[data-purl]'), (a) => a.dataset.purl)));
    let i = 0;
    const worker = async () => {
      while (i < urls.length) {
        const u = urls[i++];
        pings[u] = await pingOne(u);
        paintPings();
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, urls.length) }, worker));
    // старые адреса не копим
    const keep = new Set(urls);
    Object.keys(pings).forEach((k) => { if (!keep.has(k) && Date.now() - pings[k].t > 864e5) delete pings[k]; });
    try { localStorage.setItem('rdb2_ping', JSON.stringify(pings)); } catch {}
  })();
  try { await pingRun; } finally { pingRun = null; }
}
function schedulePings() {
  if (pingTimer || document.hidden) return;
  const urls = Array.from(document.querySelectorAll('.lnk[data-purl]'), (a) => a.dataset.purl);
  if (!urls.length) return;
  // сразу проверяем то, что давно не проверяли; дальше — раз в минуту, пока вкладка на экране
  const oldest = Math.min(...urls.map((u) => (pings[u] ? pings[u].t : 0)));
  const wait = clamp(oldest + PING_EVERY - Date.now(), 300, PING_EVERY);
  pingTimer = setTimeout(async () => { pingTimer = 0; if (!document.hidden) await runPings(); schedulePings(); }, wait);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { clearTimeout(pingTimer); pingTimer = 0; } else schedulePings();
});

// ---------- заметка и дела ----------
function noteBody(g, body) {
  const ta = h('textarea', { class: 'note', placeholder: t('notePh'), value: g.text || '', spellcheck: false });
  const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(600, ta.scrollHeight + 2) + 'px'; };
  ta.addEventListener('input', () => { g.text = ta.value; fit(); save(false); });
  requestAnimationFrame(fit);
  body.append(ta);
}
// plaintext-only есть не во всех версиях Firefox — тогда обычный contenteditable
function editable(el) {
  if (state.settings.lock) return el;
  try { el.contentEditable = 'plaintext-only'; } catch { el.contentEditable = 'true'; }
  return el;
}
function todoBody(g, body) {
  const ul = h('ul', { class: 'todo' });
  g.items.forEach((it) => {
    const li = h('li', { class: it.done ? 'done' : '' },
      h('button', { class: 'chk', html: it.done ? svg('check') : '', onclick: () => { it.done = !it.done; save(); } }),
      editable(h('span', { class: 'todo-txt', text: it.text,
        onblur: (e) => { const v = e.target.textContent.trim(); if (v !== it.text) { if (v) it.text = v; else g.items.splice(g.items.indexOf(it), 1); save(); } },
        onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } } })),
      h('button', { class: 'todo-del', html: svg('x'), onclick: () => { g.items.splice(g.items.indexOf(it), 1); save(); } }));
    ul.append(li);
  });
  const inp = h('input', { class: 'todo-add', placeholder: t('todoPh'),
    onkeydown: (e) => { if (e.key === 'Enter' && inp.value.trim()) { g.items.push({ id: uid(), text: inp.value.trim(), done: false }); save(); requestAnimationFrame(() => $(`[data-gid="${g.id}"] .todo-add`)?.focus()); } } });
  body.append(ul, inp);
}

// ---------- виджеты ----------
const WMO = (c) => c === 0 ? '☀️' : c <= 2 ? '🌤️' : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 57 ? '🌦️' : c <= 67 ? '🌧️' : c <= 77 ? '🌨️' : c <= 82 ? '🌧️' : c <= 86 ? '🌨️' : '⛈️';
const fresh = (rec, min) => rec && Date.now() - rec.t < min * 60e3;
function loadWidgets() {
  state.groups.forEach((g) => {
    if (g.collapsed) return;
    const el = $(`.w-load[data-wid="${g.id}"]`);
    if (!el) return;
    const fn = { weather: wWeather, currency: wCurrency, crypto: wCrypto, clock: wClock, calendar: wCalendar, countdown: wCountdown,
      rss: wRss, iframe: wIframe, github: wGithub, topsites: wTopsites, server: wServer }[g.kind];
    if (fn) fn(g, el).catch((e) => { console.warn(e); el.replaceChildren(h('div', { class: 'w-msg', text: t('err') })); });
  });
}
async function geocode(city) {
  const k = city.trim().toLowerCase();
  if (cache.c.geo[k]) return cache.c.geo[k];
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${R.lang()}&format=json`);
  const j = await r.json();
  if (!j.results || !j.results.length) throw new Error('city');
  const v = { lat: j.results[0].latitude, lon: j.results[0].longitude, name: j.results[0].name };
  cache.c.geo[k] = v; cache.save();
  return v;
}
async function wWeather(g, el) {
  if (!(g.city || '').trim()) { el.replaceChildren(h('button', { class: 'w-msg link', text: t('noCity'), onclick: () => openGroupDialog({ group: g }) })); return; }
  const geo = await geocode(g.city);
  const ck = `${geo.lat},${geo.lon}`;
  let rec = cache.c.wx[ck];
  if (!fresh(rec, 30)) {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=8`);
    rec = { t: Date.now(), d: await r.json() };
    cache.c.wx[ck] = rec; cache.save();
  }
  const d = rec.d, cur = d.current;
  const loc = R.lang() === 'ru' ? 'ru-RU' : undefined;
  const nowRow = h('div', { class: 'wx-now' },
    h('span', { class: 'wx-ic', text: WMO(cur.weather_code) }),
    h('span', { class: 'wx-t', text: Math.round(cur.temperature_2m) + '°' }),
    h('span', { class: 'wx-meta' },
      h('b', { text: geo.name }),
      h('span', { text: `${R.lang() === 'ru' ? 'ощущ.' : 'feels'} ${Math.round(cur.apparent_temperature)}° · ${Math.round(cur.wind_speed_10m)} ${R.lang() === 'ru' ? 'км/ч' : 'km/h'} · ${cur.relative_humidity_2m}%` })));
  const out = [nowRow];
  const hours = clamp(+g.hours || 0, 0, 24);
  if (hours) {
    const start = d.hourly.time.findIndex((x) => new Date(x) > new Date());
    const row = h('div', { class: 'wx-row' });
    for (let i = start; i < start + hours && i < d.hourly.time.length; i += 3) {
      row.append(h('div', { class: 'wx-cell' }, h('span', { text: new Date(d.hourly.time[i]).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12 }) }),
        h('span', { class: 'wx-ci', text: WMO(d.hourly.weather_code[i]) }), h('b', { text: Math.round(d.hourly.temperature_2m[i]) + '°' })));
    }
    out.push(row);
  }
  const days = clamp(+g.days || 0, 0, 7);
  if (days) {
    const row = h('div', { class: 'wx-row' });
    for (let i = 1; i <= days && i < d.daily.time.length; i++) {
      row.append(h('div', { class: 'wx-cell' }, h('span', { text: new Date(d.daily.time[i] + 'T12:00').toLocaleDateString(loc, { weekday: 'short' }) }),
        h('span', { class: 'wx-ci', text: WMO(d.daily.weather_code[i]) }),
        h('b', { text: Math.round(d.daily.temperature_2m_max[i]) + '°' }), h('small', { text: Math.round(d.daily.temperature_2m_min[i]) + '°' })));
    }
    out.push(row);
  }
  el.replaceChildren(...out);
}
const CUR_SYM = { USD: '$', EUR: '€', UAH: '₴', GBP: '£', PLN: 'zł', JPY: '¥', CNY: '¥', CHF: '₣', CZK: 'Kč', RUB: '₽', KZT: '₸', TRY: '₺', GEL: '₾',
  INR: '₹', ILS: '₪', KRW: '₩', AZN: '₼', AMD: '֏', BYN: 'Br' };
const CURRENCIES = ['USD', 'EUR', 'UAH', 'RUB', 'GBP', 'PLN', 'CHF', 'JPY', 'CNY', 'CZK', 'SEK', 'NOK', 'CAD', 'AUD', 'KZT', 'TRY', 'GEL', 'BYN', 'ILS', 'INR',
  'MDL', 'AZN', 'AMD', 'UZS', 'HUF', 'RON', 'BGN', 'KRW', 'AED'];
// курсы с историей по датам, без ключа: fawazahmed0/exchange-api (jsDelivr, запасной зеркальный хост на Cloudflare)
async function fxDay(base, date) {
  const b = base.toLowerCase();
  for (const u of [`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${b}.json`,
    `https://${date}.currency-api.pages.dev/v1/currencies/${b}.json`]) {
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const j = await r.json();
      if (!j[b]) continue;
      const rates = {};
      CURRENCIES.forEach((c) => { const v = j[b][c.toLowerCase()]; if (v) rates[c] = v; }); // храним только нужное — кэш маленький
      return { date: j.date, rates };
    } catch {}
  }
  return null;
}
function shiftDate(iso, days) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - days); return d.toISOString().slice(0, 10); }
async function wCurrency(g, el) {
  const base = g.base || 'USD';
  const back = [1, 7, 30].includes(+g.cmp) ? +g.cmp : 1;
  const fx = cache.c.fx2 || (cache.c.fx2 = {});
  const days = cache.c.fxDays || (cache.c.fxDays = {});
  let cur = fx[base];
  if (!fresh(cur, 180)) {
    const r = await fxDay(base, 'latest');
    if (r) cur = fx[base] = { t: Date.now(), ...r };
    else if (!cur) {
      // запасной вариант — старый источник, только текущий курс без истории
      const j = await (await fetch(`https://open.er-api.com/v6/latest/${base}`)).json();
      if (j.result !== 'success') throw new Error('fx');
      cur = { t: Date.now() - 170 * 60e3, date: '', rates: j.rates };
    }
  }
  let prev = null;
  if (cur.date) {
    const pd = shiftDate(cur.date, back);
    const pk = base + '@' + pd;
    prev = days[pk] || null;
    if (!prev) {
      const r = await fxDay(base, pd);
      if (r) {
        prev = days[pk] = r.rates;
        const keys = Object.keys(days);
        if (keys.length > 24) keys.slice(0, keys.length - 24).forEach((k) => delete days[k]);
      }
    }
  }
  cache.save();
  const sym = CUR_SYM[base] || base;
  const digits = (v) => (v < 0.1 ? 5 : v < 1 ? 4 : v < 100 ? 3 : 2);
  const fmt = (v, d = digits(v)) => v.toLocaleString(locale(), { maximumFractionDigits: d, minimumFractionDigits: Math.min(2, d) });
  const wasLabel = t('was' + back);
  const rows = (g.symbols || []).filter((s) => s !== base && cur.rates[s]).map((s) => {
    const v = 1 / cur.rates[s];
    const p = prev && prev[s] ? 1 / prev[s] : null;
    const diff = p ? v - p : 0;
    const pct = p ? (diff / p) * 100 : 0;
    const dir = !p || Math.abs(pct) < 0.005 ? '' : diff > 0 ? 'up' : 'down';
    const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
    const row = h('div', { class: 'kv fx' },
      h('span', { class: 'kv-k', text: s }),
      h('span', { class: 'fx-v' },
        h('span', { class: 'kv-v', text: fmt(v) + ' ' + sym }),
        p ? h('small', { text: `${wasLabel}: ${fmt(p)}` }) : null),
      p ? h('span', { class: 'fx-d kv-d ' + dir },
        h('b', { text: (dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : '') + sign + fmt(Math.abs(diff), Math.max(2, digits(v))) }),
        h('small', { text: sign + Math.abs(pct).toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' })) : h('span'));
    row.title = p ? `1 ${s} = ${fmt(v, 6)} ${base}\n${shiftDate(cur.date, back)}: ${fmt(p, 6)} ${base}` : `1 ${s} = ${fmt(v, 6)} ${base}`;
    return row;
  });
  const out = rows.length ? rows : [h('button', { class: 'w-msg link', text: t('symbols'), onclick: () => openGroupDialog({ group: g }) })];
  if (rows.length && cur.date) {
    out.push(h('div', { class: 'fx-foot', text: t('fxDate', new Date(cur.date + 'T12:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long' })) }));
  }
  el.replaceChildren(...out);
}
const COIN_IDS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', DOGE: 'dogecoin', XRP: 'ripple', ADA: 'cardano', TON: 'the-open-network', BNB: 'binancecoin',
  LTC: 'litecoin', TRX: 'tron', AVAX: 'avalanche-2', LINK: 'chainlink', DOT: 'polkadot', USDT: 'tether', USDC: 'usd-coin', XMR: 'monero', ATOM: 'cosmos', NEAR: 'near', SUI: 'sui' };
async function wCrypto(g, el) {
  const coins = (g.coins || []).map((c) => c.trim()).filter(Boolean);
  const ids = coins.map((c) => COIN_IDS[c.toUpperCase()] || c.toLowerCase());
  const key = ids.join(',');
  let rec = cache.c.cr[key];
  if (!fresh(rec, 10)) {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(key)}&vs_currencies=usd&include_24hr_change=true`);
    rec = { t: Date.now(), d: await r.json() };
    cache.c.cr[key] = rec; cache.save();
  }
  el.replaceChildren(...coins.map((c, i) => {
    const v = rec.d[ids[i]];
    if (!v) return h('div', { class: 'kv' }, h('span', { class: 'kv-k', text: c.toUpperCase() }), h('span', { class: 'kv-v', text: '—' }));
    const ch = v.usd_24h_change || 0;
    return h('div', { class: 'kv' }, h('span', { class: 'kv-k', text: c.toUpperCase() }),
      h('span', { class: 'kv-v', text: '$' + v.usd.toLocaleString(undefined, { maximumFractionDigits: v.usd < 10 ? 4 : 0 }) }),
      h('span', { class: 'kv-d ' + (ch >= 0 ? 'up' : 'down'), text: (ch >= 0 ? '+' : '') + ch.toFixed(1) + '%' }));
  }));
}


// ---------- новые виджеты ----------
const locale = () => (R.lang() === 'ru' ? 'ru-RU' : undefined);
function relTime(date) {
  const diff = (date - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto', style: 'short' });
  const a = Math.abs(diff);
  if (a < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (a < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  if (a < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), 'month');
  return rtf.format(Math.round(diff / (86400 * 365)), 'year');
}
// «Киев=Europe/Kyiv» или просто «Europe/Kyiv»
function parseZone(z) {
  const [a, b] = z.includes('=') ? z.split('=') : [null, z];
  const tz = (b || '').trim();
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); } catch { return null; }
  return { tz, label: (a || tz.split('/').pop().replace(/_/g, ' ')).trim() };
}
function tzOffsetMin(tz, d) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    .formatToParts(d).reduce((o, x) => (o[x.type] = x.value, o), {});
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(d.getTime() / 60000) * 60000) / 60000;
}
async function wClock(g, el) {
  const now = new Date();
  const local = -now.getTimezoneOffset();
  const rows = (g.zones || []).map(parseZone).filter(Boolean).map((z) => {
    const diff = (tzOffsetMin(z.tz, now) - local) / 60;
    const day = now.toLocaleDateString(locale(), { timeZone: z.tz, weekday: 'short' });
    const sameDay = day === now.toLocaleDateString(locale(), { weekday: 'short' });
    return h('div', { class: 'kv clock-row' }, h('span', { class: 'kv-k2', text: z.label }),
      h('span', { class: 'kv-v big', text: now.toLocaleTimeString(locale(), { timeZone: z.tz, hour: '2-digit', minute: '2-digit', hour12 }) }),
      h('span', { class: 'kv-d', text: (sameDay ? '' : day + ' ') + (diff ? (diff > 0 ? '+' : '') + (Number.isInteger(diff) ? diff : diff.toFixed(1)) + (R.lang() === 'ru' ? ' ч' : 'h') : '') }));
  });
  el.replaceChildren(...(rows.length ? rows : [h('button', { class: 'w-msg link', text: t('zones'), onclick: () => openGroupDialog({ group: g }) })]));
}
const calShift = {};
async function wCalendar(g, el) {
  const now = new Date();
  const shift = calShift[g.id] || 0;
  const m = new Date(now.getFullYear(), now.getMonth() + shift, 1);
  const monStart = R.lang() === 'ru' || !/^en-US/.test(navigator.language);
  const first = (m.getDay() + (monStart ? 6 : 0)) % 7;
  const daysIn = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const title = m.toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
  const go = (d) => { calShift[g.id] = shift + d; wCalendar(g, el); };
  const head = h('div', { class: 'cal-head' },
    h('button', { class: 'tool', html: svg('left'), onclick: () => go(-1) }),
    h('button', { class: 'cal-title', text: title[0].toUpperCase() + title.slice(1), onclick: () => { calShift[g.id] = 0; wCalendar(g, el); } }),
    h('button', { class: 'tool', html: svg('right'), onclick: () => go(1) }));
  const grid = h('div', { class: 'cal' });
  for (let i = 0; i < 7; i++) {
    const d = new Date(2024, 0, (monStart ? 1 : 7) + i); // 1 янв 2024 — понедельник
    grid.append(h('span', { class: 'cal-wd', text: d.toLocaleDateString(locale(), { weekday: 'short' }).slice(0, 2) }));
  }
  for (let i = 0; i < first; i++) grid.append(h('span'));
  for (let d = 1; d <= daysIn; d++) {
    const isToday = shift === 0 && d === now.getDate();
    const wd = (first + d - 1) % 7;
    grid.append(h('span', { class: 'cal-d' + (isToday ? ' today' : '') + ((monStart ? wd >= 5 : wd === 0 || wd === 6) ? ' we' : ''), text: d }));
  }
  el.replaceChildren(head, grid);
}
async function wCountdown(g, el) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const evs = (g.events || []).map((e) => ({ ...e, d: new Date(e.date + 'T00:00') })).filter((e) => !isNaN(e.d))
    .map((e) => ({ ...e, left: Math.round((e.d - today) / 864e5) }))
    .sort((a, b) => (a.left < 0) - (b.left < 0) || Math.abs(a.left) - Math.abs(b.left));
  if (!evs.length) { el.replaceChildren(h('button', { class: 'w-msg link', text: t('noEvents'), onclick: () => openGroupDialog({ group: g }) })); return; }
  el.replaceChildren(...evs.map((e) => h('div', { class: 'cd' + (e.left < 0 ? ' past' : '') },
    h('span', { class: 'cd-n', text: e.left === 0 ? '🎉' : Math.abs(e.left) }),
    h('span', { class: 'cd-t' }, h('b', { text: e.title }),
      h('small', { text: e.left === 0 ? t('today') : e.d.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: e.d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined }) + (e.left < 0 ? ' · ' + t('passed') : '') })))));
}
// доступ к чужим сайтам — только по запросу и только к нужному
// без порта: Firefox не принимает порт в шаблоне доступа, а Chrome без порта и так пускает на любой
function originOf(url) { const u = R.parseUrl(url); return u && /^https?:$/.test(u.protocol) ? `${u.protocol}//${u.hostname}/*` : null; }
async function hasOrigin(url) {
  const o = originOf(url);
  try { return !!(o && ext && ext.permissions && await ext.permissions.contains({ origins: [o] })); } catch { return false; }
}
function askOrigin(url) { const o = originOf(url); return o && ext && ext.permissions ? ext.permissions.request({ origins: [o] }).catch(() => false) : Promise.resolve(false); }
function grantBtn(url, g, el, fn) {
  return h('div', { class: 'grant' }, h('span', { class: 'w-msg', text: t('needAccess', (R.parseUrl(url) || {}).hostname || url) }),
    h('button', { class: 'btn ghost sm', text: t('grant'), onclick: async () => { if (await askOrigin(url)) { await allowFraming(url); fn(g, el); } } }));
}
async function wRss(g, el) {
  if (!g.feed) { el.replaceChildren(h('button', { class: 'w-msg link', text: t('feed'), onclick: () => openGroupDialog({ group: g }) })); return; }
  let rec = cache.c.rss && cache.c.rss[g.feed];
  if (!fresh(rec, 30)) {
    if (!await hasOrigin(g.feed)) { el.replaceChildren(grantBtn(g.feed, g, el, wRss)); return; }
    const txt = await (await fetch(g.feed)).text();
    const doc = new DOMParser().parseFromString(txt, 'text/xml');
    const nodes = Array.from(doc.querySelectorAll('item, entry')).slice(0, 30);
    const pick = (n, sel) => { const x = n.querySelector(sel); return x ? x.textContent.trim() : ''; };
    const items = nodes.map((n) => {
      const ln = n.querySelector('link');
      return { t: pick(n, 'title'), u: (ln && (ln.getAttribute('href') || ln.textContent.trim())) || '', d: Date.parse(pick(n, 'pubDate') || pick(n, 'updated') || pick(n, 'published') || pick(n, 'date')) || 0 };
    }).filter((x) => x.t && x.u);
    rec = { t: Date.now(), items, title: pick(doc, 'channel > title') || pick(doc, 'feed > title') };
    (cache.c.rss = cache.c.rss || {})[g.feed] = rec; cache.save();
  }
  const list = rec.items.slice(0, clamp(+g.count || 6, 1, 20));
  if (!list.length) { el.replaceChildren(h('div', { class: 'w-msg', text: '—' })); return; }
  el.replaceChildren(...list.map((x) => {
    const a = h('a', { class: 'feed', href: x.u, title: x.t }, h('span', { class: 'feed-t', text: x.t }), x.d ? h('small', { text: relTime(x.d) }) : null);
    if (state.settings.newTab) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }));
}
// Grafana, Uptime Kuma и многие панели шлют X-Frame-Options / CSP frame-ancestors — браузер показывает «отклонено».
// С доступом к сайту расширение снимает эти заголовки, но только для фреймов внутри своей же страницы.
const dnr = () => (ext && ext.declarativeNetRequest && ext.declarativeNetRequest.updateDynamicRules ? ext.declarativeNetRequest : null);
async function frameRules() { try { return (await dnr().getDynamicRules()) || []; } catch { return []; } }
async function allowFraming(url) {
  const u = R.parseUrl(url);
  if (!dnr() || !u) return false;
  const host = u.hostname.toLowerCase();
  const rules = await frameRules();
  const old = rules.find((r) => (r.condition.requestDomains || []).includes(host));
  if (old && (old.condition.resourceTypes || []).includes('xmlhttprequest')) return true;
  const id = rules.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  try {
    await dnr().updateDynamicRules({ removeRuleIds: old ? [old.id] : [], addRules: [{ id, priority: 1,
      action: { type: 'modifyHeaders',
        responseHeaders: [{ header: 'x-frame-options', operation: 'remove' }, { header: 'content-security-policy', operation: 'remove' }],
        requestHeaders: [{ header: 'origin', operation: 'remove' }] },
      condition: { requestDomains: [host], resourceTypes: ['sub_frame', 'xmlhttprequest'], initiatorDomains: [location.hostname] } }] });
    return true;
  } catch (e) { console.warn('dnr', e); return false; }
}
// правила для сайтов, которых больше нет во встроенных страницах, убираем
async function syncFrameRules() {
  if (!dnr()) return;
  const hosts = new Set(state.groups.filter((g) => ['iframe', 'server'].includes(g.kind) && g.url).map((g) => (R.parseUrl(g.url) || {}).hostname).filter(Boolean));
  const stale = (await frameRules()).filter((r) => !(r.condition.requestDomains || []).some((d) => hosts.has(d))).map((r) => r.id);
  if (stale.length) dnr().updateDynamicRules({ removeRuleIds: stale }).catch(() => {});
}
// YouTube и пр. целиком в рамке не живут — у них есть специальные адреса для встраивания
function embedUrl(url) {
  const u = R.parseUrl(url);
  if (!u) return url;
  const host = u.hostname.replace(/^(www|m)\./, '');
  let id = '';
  if (host === 'youtu.be') id = u.pathname.slice(1);
  else if (/(^|\.)youtube\.com$/.test(host)) id = u.searchParams.get('v') || (/^\/(shorts|live)\/([\w-]+)/.exec(u.pathname) || [])[2] || '';
  if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
  if (/(^|\.)youtube\.com$/.test(host) && u.searchParams.get('list')) return `https://www.youtube-nocookie.com/embed/videoseries?list=${u.searchParams.get('list')}`;
  if (host === 'vimeo.com' && /^\/\d+/.test(u.pathname)) return `https://player.vimeo.com/video${u.pathname}`;
  return url;
}
async function wIframe(g, el) {
  if (!g.url) { el.replaceChildren(h('button', { class: 'w-msg link', text: t('pageUrl'), onclick: () => openGroupDialog({ group: g }) })); return; }
  const src = embedUrl(g.url);
  const canAsk = !!(ext && ext.permissions && originOf(src));
  const allowed = canAsk && src === g.url ? await hasOrigin(src) : true;
  if (allowed && canAsk && src === g.url) await allowFraming(src); // Chrome; в Firefox заголовки снимает фоновый скрипт
  const fr = h('iframe', { class: 'frame', src, loading: 'lazy', allow: 'fullscreen; picture-in-picture; encrypted-media', allowFullscreen: true,
    referrerPolicy: 'strict-origin-when-cross-origin', style: { height: clamp(+g.height || 320, 120, 1200) + 'px' } });
  const out = [fr, h('a', { class: 'frame-open', href: g.url, target: '_blank', rel: 'noopener', title: t('openNew'), html: svg('ext') })];
  if (!allowed) {
    out.push(h('div', { class: 'frame-hint' }, h('span', { text: t('frameHint') }),
      h('button', { class: 'btn ghost sm', text: t('frameAllow'), onclick: async () => {
        if (await askOrigin(src)) { await allowFraming(src); wIframe(g, el); }
      } })));
  }
  el.replaceChildren(...out);
}
async function wGithub(g, el) {
  const repos = (g.repos || []).map((r) => r.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '')).filter((r) => /^[\w.-]+\/[\w.-]+$/.test(r));
  if (!repos.length) { el.replaceChildren(h('button', { class: 'w-msg link', text: t('repos'), onclick: () => openGroupDialog({ group: g }) })); return; }
  cache.c.gh = cache.c.gh || {};
  // лимит GitHub без токена — 60 запросов в час, поэтому кэш на 6 часов
  const rows = await Promise.all(repos.map(async (r) => {
    let rec = cache.c.gh[r];
    if (!fresh(rec, 360)) {
      try {
        let res = await fetch(`https://api.github.com/repos/${r}/releases/latest`);
        if (res.ok) { const j = await res.json(); rec = { t: Date.now(), tag: j.tag_name, at: Date.parse(j.published_at), url: j.html_url }; }
        else if (res.status === 404) {
          res = await fetch(`https://api.github.com/repos/${r}/tags?per_page=1`);
          const j = res.ok ? await res.json() : [];
          rec = { t: Date.now(), tag: j[0] ? j[0].name : '—', at: 0, url: `https://github.com/${r}/tags` };
        } else rec = rec || null;
        if (rec) cache.c.gh[r] = rec;
      } catch {}
    }
    const [owner, repo] = r.split('/');
    const name = /^(core|app|server|web|frontend|backend|docs|main|api|ui|desktop|android|ios)$/i.test(repo) ? owner : repo;
    const a = h('a', { class: 'rel', href: (rec && rec.url) || `https://github.com/${r}`, title: r },
      iconBox({ title: name, url: `https://${name}.local` }, 'ic sm'),
      h('span', { class: 'rel-n', text: name }),
      h('span', { class: 'rel-v' + (rec && rec.at && Date.now() - rec.at < 3 * 864e5 ? ' new' : ''), text: rec ? rec.tag : '…' }),
      h('small', { text: rec && rec.at ? relTime(rec.at) : '' }));
    if (state.settings.newTab) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }));
  cache.save();
  el.replaceChildren(...rows);
}
async function wTopsites(g, el) {
  let ok = false;
  try { ok = !!(ext && ext.permissions && await ext.permissions.contains({ permissions: ['topSites'] })); } catch {}
  if (!ok || !ext.topSites) {
    el.replaceChildren(h('div', { class: 'grant' }, h('span', { class: 'w-msg', text: t('noAccess') }),
      h('button', { class: 'btn ghost sm', text: t('grant'), onclick: async () => { if (await ext.permissions.request({ permissions: ['topSites'] }).catch(() => false)) render(); } })));
    return;
  }
  const mine = new Set(linkGroups().flatMap((x) => x.items.map((l) => l.url.replace(/\/+$/, ''))));
  const sites = (await ext.topSites.get()).filter((s) => /^https?:/.test(s.url) && !mine.has(s.url.replace(/\/+$/, ''))).slice(0, clamp(+g.count || 8, 1, 24));
  const box = h('div', { class: 'links v-tiles' });
  sites.forEach((s) => {
    const l = { id: 'ts' + s.url, url: s.url, title: R.cleanTitle(s.title, s.url) || R.titleFromUrl(s.url) };
    const a = h('a', { class: 'lnk', href: s.url, title: s.url }, iconBox(l), h('span', { class: 'lnk-txt' }, h('span', { class: 'lnk-title', text: l.title })));
    a.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); openMenuAt(e.clientX, e.clientY, [
      { icon: 'plus', label: t('addLink'), sub: (linkGroups().length ? linkGroups() : [{ id: null, title: t('inbox') }]).map((x) => ({ label: x.title || t('untitled'), run: () => { quickAdd(s.url, x.id, { title: l.title }); } })) },
      { icon: 'ext', label: t('openNew'), run: () => window.open(s.url, '_blank', 'noopener') }]); });
    box.append(a);
  });
  el.replaceChildren(box);
}

// ---------- виджет «Сервер»: Glances, Netdata, Proxmox ----------
// Токен Proxmox — только на этом устройстве: не синхронизируются и не попадают в экспорт.
const SECRETS = 'rdb2_secrets';
let secrets = {};
async function loadSecrets() {
  try {
    secrets = ext && ext.storage && ext.storage.local ? ((await ext.storage.local.get(SECRETS)) || {})[SECRETS] || {} : JSON.parse(localStorage.getItem(SECRETS) || '{}');
  } catch { secrets = {}; }
}
function saveSecrets() {
  try {
    if (ext && ext.storage && ext.storage.local) ext.storage.local.set({ [SECRETS]: secrets });
    else localStorage.setItem(SECRETS, JSON.stringify(secrets));
  } catch {}
}
const secretOf = (g) => secrets[g.id] || {};

// автообновление живых виджетов, пока вкладка на экране
const live = new Map();
function scheduleLive(g, el, fn, sec) {
  clearTimeout(live.get(g.id));
  live.set(g.id, setTimeout(() => {
    live.delete(g.id);
    if (!el.isConnected) return;
    if (document.hidden) { scheduleLive(g, el, fn, sec); return; }
    fn(g, el).catch((e) => widgetErr(g, el, e, fn));
  }, sec * 1000));
}
function clearLive() { live.forEach((x) => clearTimeout(x)); live.clear(); }

const fmtBytes = (n) => {
  if (!(n >= 0)) return '—';
  const u = R.lang() === 'ru' ? ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ', 'ПБ'] : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return n.toLocaleString(locale(), { maximumFractionDigits: n < 10 && i ? 1 : 0 }) + ' ' + u[i];
};
function fmtUptime(sec) {
  sec = +sec || 0;
  const d = Math.floor(sec / 86400), hh = Math.floor((sec % 86400) / 3600), mm = Math.floor((sec % 3600) / 60);
  const ru = R.lang() === 'ru';
  return d ? `${d} ${ru ? 'дн.' : 'd'} ${hh} ${ru ? 'ч' : 'h'}` : hh ? `${hh} ${ru ? 'ч' : 'h'} ${mm} ${ru ? 'мин' : 'm'}` : `${mm} ${ru ? 'мин' : 'm'}`;
}
function bar(label, pct, note) {
  pct = clamp(+pct || 0, 0, 100);
  return h('div', { class: 'bar-row' },
    h('span', { class: 'bar-l', text: label }),
    h('span', { class: 'bar' }, h('i', { class: pct >= 90 ? 'hot' : pct >= 75 ? 'warm' : '', style: { width: pct + '%' } })),
    h('span', { class: 'bar-v', text: Math.round(pct) + '%' }),
    note ? h('small', { class: 'bar-n', text: note }) : null);
}
const wFoot = (...kids) => h('div', { class: 'w-foot' }, ...kids);

async function api(g, path, opts = {}) {
  const base = g.url.replace(/\/+$/, '');
  let r;
  try {
    r = await fetch(base + path, { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(10000), ...opts });
  } catch (e) { throw Object.assign(new Error('net'), { code: 'net' }); }
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error('auth'), { code: 'auth', status: r.status });
  if (!r.ok) throw Object.assign(new Error('http ' + r.status), { code: 'http', status: r.status });
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { return txt; }
}
async function widgetErr(g, el, e, fn) {
  const host = (R.parseUrl(g.url) || {}).host || g.url;
  const ver = ext && ext.runtime && ext.runtime.getManifest ? 'R.Db ' + ext.runtime.getManifest().version : '';
  const btns = [];
  let msg = t('err');
  if (e && e.code === 'net') {
    // разбираемся, кто виноват: no-cors-запрос не требует доступа — если он прошёл, сервер жив, а не пускает браузер
    const alive = await fetch(g.url + '/', { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(6000) }).then(() => true, () => false);
    if (alive) {
      msg = t('svcNoAccess', host);
      btns.push(h('button', { class: 'btn primary sm', text: t('grant'), onclick: async () => {
        if (await askOrigin(g.url)) { await allowFraming(g.url); el.replaceChildren(h('span', { class: 'spinner' })); fn && fn(g, el); }
      } }));
    } else {
      msg = t('svcNet', host) + ' ' + t('svcNetWhy') + (/^https:/.test(g.url) ? ' ' + t('svcCert') : R.isFirefox ? ' ' + t('svcHttpsOnly') : '');
    }
  } else if (e && e.code === 'auth') msg = t('svcAuth');
  else if (e && e.code === 'http') msg = t('svcHttp', e.status);
  if (fn) btns.push(h('button', { class: 'btn ghost sm', text: t('retry'), onclick: () => { el.replaceChildren(h('span', { class: 'spinner' })); fn(g, el); } }));
  btns.push(h('a', { class: 'btn ghost sm', href: g.url, target: '_blank', rel: 'noopener', text: t('openNew') }),
    h('button', { class: 'btn ghost sm', text: t('edit'), onclick: () => openGroupDialog({ group: g }) }));
  if (!el.isConnected) return;
  el.replaceChildren(h('div', { class: 'w-err' }, h('span', { text: msg }), h('span', { class: 'btns' }, ...btns), ver ? h('small', { class: 'w-ver', text: ver }) : null));
  if (fn) scheduleLive(g, el, fn, 60);
}
// общая обвязка: адрес задан? доступ к сайту есть? ошибки — понятным текстом
function svcWidget(fn, every) {
  const run = async (g, el) => {
    if (!g.url) { el.replaceChildren(h('button', { class: 'w-msg link', text: t('svcSetup'), onclick: () => openGroupDialog({ group: g }) })); return; }
    if (ext && ext.permissions && !await hasOrigin(g.url)) { el.replaceChildren(grantBtn(g.url, g, el, run)); return; }
    await allowFraming(g.url); // правило без Origin для этого хоста (уже есть — ничего не делает)
    try {
      await fn(g, el);
      scheduleLive(g, el, run, every);
    } catch (e) { console.warn(g.kind, e); widgetErr(g, el, e, run); }
  };
  return run;
}

// --- сервер: Glances, Netdata, Proxmox ---
const wServer = svcWidget(async (g, el) => {
  const src = g.source || 'glances';
  if (src === 'glances') {
    let v = 4;
    let ql = await api(g, '/api/4/quicklook').catch((e) => { if (e.code === 'http') { v = 3; return null; } throw e; });
    if (!ql) ql = await api(g, '/api/3/quicklook');
    const [mem, fs, up] = await Promise.all([api(g, `/api/${v}/mem`).catch(() => null), api(g, `/api/${v}/fs`).catch(() => []), api(g, `/api/${v}/uptime`).catch(() => '')]);
    const rows = [bar('CPU', ql.cpu), bar('RAM', mem ? mem.percent : ql.mem, mem ? `${fmtBytes(mem.used)} / ${fmtBytes(mem.total)}` : '')];
    (Array.isArray(fs) ? fs : []).filter((d) => d.size > 2 ** 30 && !/^\/(boot|snap|run|dev|sys|proc)|^\/var\/lib\/docker/.test(d.mnt_point || '')).slice(0, 3)
      .forEach((d) => rows.push(bar(d.mnt_point === '/' ? (R.lang() === 'ru' ? 'Диск' : 'Disk') : d.mnt_point, d.percent, `${fmtBytes(d.free ?? d.size - d.used)} ${t('free')}`)));
    if (ql.swap) rows.push(bar('Swap', ql.swap));
    el.replaceChildren(...rows, wFoot(ql.cpu_name ? h('span', { text: ql.cpu_name }) : null, up ? h('span', { text: '⏱ ' + String(up).replace(/"/g, '') }) : null));
  } else if (src === 'netdata') {
    const last = async (chart) => {
      const d = await api(g, `/api/v1/data?chart=${encodeURIComponent(chart)}&after=-2&points=1&group=average&format=json&options=abs`);
      const row = d.data[0] || [];
      const o = {};
      d.labels.forEach((l, i) => { if (i) o[l] = +row[i] || 0; });
      return o;
    };
    const [cpu, ram, disk, up] = await Promise.all([last('system.cpu'), last('system.ram'), last('disk_space._').catch(() => null), last('system.uptime').catch(() => null)]);
    const cpuPct = Object.values(cpu).reduce((a, b) => a + b, 0);
    const ramTotal = Object.values(ram).reduce((a, b) => a + b, 0);
    const rows = [bar('CPU', cpuPct), bar('RAM', ramTotal ? (ram.used / ramTotal) * 100 : 0, `${fmtBytes(ram.used * 2 ** 20)} / ${fmtBytes(ramTotal * 2 ** 20)}`)];
    if (disk) {
      const tot = (disk.avail || 0) + (disk.used || 0) + (disk['reserved for root'] || 0);
      rows.push(bar(R.lang() === 'ru' ? 'Диск' : 'Disk', tot ? (disk.used / tot) * 100 : 0, `${fmtBytes(disk.avail * 2 ** 30)} ${t('free')}`));
    }
    el.replaceChildren(...rows, up ? wFoot(h('span', { text: '⏱ ' + fmtUptime(up.uptime) })) : '');
  } else {
    const tok = secretOf(g).token;
    if (!tok) throw Object.assign(new Error('auth'), { code: 'auth' });
    const hdr = { headers: { Authorization: 'PVEAPIToken=' + tok.replace(/^PVEAPIToken=/, '') } };
    const [nodes, vms] = await Promise.all([api(g, '/api2/json/nodes', hdr), api(g, '/api2/json/cluster/resources?type=vm', hdr).catch(() => null)]);
    const out = [];
    (nodes.data || []).sort((a, b) => a.node.localeCompare(b.node)).forEach((n) => {
      out.push(h('div', { class: 'node-h' }, h('span', { class: 'ping', 'data-s': n.status === 'online' ? 'up' : 'down' }), h('b', { text: n.node }),
        n.uptime ? h('small', { text: '⏱ ' + fmtUptime(n.uptime) }) : null));
      if (n.status === 'online') {
        out.push(bar('CPU', n.cpu * 100, n.maxcpu ? n.maxcpu + ' CPU' : ''), bar('RAM', (n.mem / n.maxmem) * 100, `${fmtBytes(n.mem)} / ${fmtBytes(n.maxmem)}`),
          bar(R.lang() === 'ru' ? 'Диск' : 'Disk', (n.disk / n.maxdisk) * 100, `${fmtBytes(n.maxdisk - n.disk)} ${t('free')}`));
      }
    });
    if (vms && vms.data) {
      const all = vms.data.filter((x) => !x.template);
      const run = all.filter((x) => x.status === 'running').length;
      out.push(wFoot(h('span', { text: t('vmRun', run, all.length) })));
    }
    el.replaceChildren(...out);
  }
}, 15);

// ---------- перетаскивание ----------
let drag = null;
let dropMark = null;
function clearDrop() {
  document.querySelectorAll('.drop-before,.drop-after,.drop-into').forEach((x) => x.classList.remove('drop-before', 'drop-after', 'drop-into'));
  dropMark = null;
}
function externalUrl(dt) {
  const u = dt.getData('text/uri-list') || dt.getData('text/plain') || '';
  const line = u.split(/\r?\n/).find((x) => x && !x.startsWith('#')) || '';
  return /^(https?:\/\/|www\.)\S+$/i.test(line.trim()) || /^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(line.trim()) ? line.trim() : '';
}
function onDragOver(e, g, card) {
  const types = Array.from(e.dataTransfer.types || []);
  if (!drag && !types.includes('text/uri-list') && !types.includes('text/plain')) return;
  if (g.kind !== 'links' || state.settings.lock) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = drag ? 'move' : 'copy';
  const over = e.target.closest('.lnk');
  clearDrop();
  if (over && (!drag || over.dataset.lid !== drag.id)) {
    const r = over.getBoundingClientRect();
    const horiz = g.view !== 'list';
    const after = horiz ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2;
    over.classList.add(after ? 'drop-after' : 'drop-before');
    dropMark = { type: 'link', target: over.dataset.lid, after };
  } else {
    card.classList.add('drop-into');
    dropMark = { type: 'link', target: null };
  }
}
function onDrop(e, g, card) {
  if (!dropMark) return;
  e.preventDefault();
  const mark = dropMark;
  clearDrop();
  let before = null;
  if (mark.target) {
    const idx = g.items.findIndex((x) => x.id === mark.target);
    before = mark.after ? (g.items[idx + 1] || {}).id || null : mark.target;
  }
  if (drag && drag.type === 'link') {
    if (before === drag.id) return;
    moveLink(drag.id, g.id, before);
  } else {
    const url = externalUrl(e.dataTransfer);
    if (!url) return;
    const res = quickAdd(url, g.id);
    if (res && before) moveLink(res.l.id, g.id, before);
    if (res) toast(t('added', g.title || t('kLinks')), t('edit'), () => openLinkDialog({ link: res.l }));
  }
}
// бросили ссылку мимо групп — в первую группу закладок
document.addEventListener('dragover', (e) => { if (!drag && !e.defaultPrevented && Array.from(e.dataTransfer.types).includes('text/uri-list')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
document.addEventListener('drop', (e) => {
  if (e.defaultPrevented || drag) return;
  e.preventDefault();
  const url = externalUrl(e.dataTransfer);
  if (!url) return;
  const res = quickAdd(url);
  if (res) toast(t('added', res.g.title), t('edit'), () => openLinkDialog({ link: res.l }));
});

// ---------- перетаскивание групп: мышью, соседи раздвигаются на лету ----------
// HTML5 drag тут неудобен: в Firefox не тянется с кнопки-заголовка, а место видно только при броске
let gdrag = null;
function startGroupDrag(e, card) {
  if (state.settings.lock || e.button !== 0 || gdrag) return;
  if (e.target.closest('.card-tools')) return;
  const sx = e.clientX, sy = e.clientY;
  const move = (ev) => {
    if (!gdrag) {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      beginGroupDrag(card, sx, sy);
    }
    ev.preventDefault();
    gdrag.x = ev.clientX; gdrag.y = ev.clientY;
    gdrag.ghost.style.left = (gdrag.x - gdrag.dx) + 'px';
    gdrag.ghost.style.top = (gdrag.y - gdrag.dy) + 'px';
    hoverGroup();
  };
  const key = (ev) => { if (ev.key === 'Escape' && gdrag) { ev.preventDefault(); stop(true); } };
  const stop = (cancel) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    window.removeEventListener('keydown', key, true);
    if (gdrag) endGroupDrag(cancel === true);
  };
  const up = () => stop(false);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('keydown', key, true);
}
function beginGroupDrag(card, sx, sy) {
  closeMenu();
  const r = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  // копия без живых iframe и без data-атрибутов, по которым ищутся виджеты
  ghost.querySelectorAll('iframe').forEach((f) => f.replaceWith(h('div', { class: 'frame', style: { height: f.style.height } })));
  ghost.querySelectorAll('[data-wid],[data-gid]').forEach((x) => { x.removeAttribute('data-wid'); x.removeAttribute('data-gid'); });
  ghost.removeAttribute('data-gid');
  ghost.className = 'drag-ghost';
  Object.assign(ghost.style, { width: r.width + 'px', left: r.left + 'px', top: r.top + 'px', gridColumn: '', gridRowEnd: '' });
  document.body.append(ghost);
  card.classList.add('placeholder');
  document.body.classList.add('g-dragging');
  gdrag = { card, ghost, dx: sx - r.left, dy: sy - r.top, x: sx, y: sy, last: null, lock: 0, raf: 0,
    origNext: card.nextSibling };
  autoScroll();
}
function hoverGroup() {
  const d = gdrag;
  if (!d || performance.now() < d.lock) return;
  const grid = $('#grid');
  const el = document.elementFromPoint(d.x, d.y);
  // над вкладкой другого стола — группа уедет туда
  const tab = el && el.closest('.board-tab[data-bid]');
  document.querySelectorAll('.board-tab.drop-into').forEach((x) => { if (x !== tab) x.classList.remove('drop-into'); });
  d.tab = tab && tab.dataset.bid !== curBoard() ? tab.dataset.bid : null;
  if (d.tab) { tab.classList.add('drop-into'); return; }
  const over = el && el.closest('#grid > .card');
  if (over === d.card) { d.last = null; return; }
  if (over) {
    if (over === d.last) return; // ждём, пока курсор уйдёт с карточки, которую только что подвинули
    const kids = Array.from(grid.children);
    const from = kids.indexOf(d.card), to = kids.indexOf(over);
    flip(() => grid.insertBefore(d.card, from < to ? over.nextSibling : over));
    d.last = over;
    return;
  }
  // ниже всех карточек — в самый конец
  const rest = Array.from(grid.children).filter((c) => c !== d.card);
  const gr = grid.getBoundingClientRect();
  if (rest.length && d.x >= gr.left && d.x <= gr.right && d.y > Math.max(...rest.map((c) => c.getBoundingClientRect().bottom))
    && grid.lastElementChild !== d.card) {
    flip(() => grid.append(d.card));
    d.last = null;
  }
}
// FLIP: запомнили, где были карточки, переставили, плавно доехали
function flip(mutate) {
  const cards = Array.from($('#grid').children);
  const before = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
  mutate();
  const moved = [];
  cards.forEach((c) => {
    const a = before.get(c), b = c.getBoundingClientRect();
    const dx = a.left - b.left, dy = a.top - b.top;
    if (!dx && !dy) return;
    c.style.transition = 'none';
    c.style.transform = `translate(${dx}px, ${dy}px)`;
    moved.push(c);
  });
  void document.body.offsetWidth;
  moved.forEach((c) => {
    c.style.transition = 'transform .2s cubic-bezier(.2,.7,.3,1)';
    c.style.transform = '';
    setTimeout(() => { c.style.transition = ''; }, 220);
  });
  if (gdrag) gdrag.lock = performance.now() + 160;
}
function autoScroll() {
  const d = gdrag;
  if (!d) return;
  const edge = 80;
  const v = d.y < edge ? -(edge - d.y) / 3 : d.y > window.innerHeight - edge ? (d.y - (window.innerHeight - edge)) / 3 : 0;
  if (v) { window.scrollBy(0, v); hoverGroup(); }
  d.raf = requestAnimationFrame(autoScroll);
}
function endGroupDrag(cancel) {
  const d = gdrag;
  gdrag = null;
  cancelAnimationFrame(d.raf);
  const grid = $('#grid');
  if (cancel) flip(() => grid.insertBefore(d.card, d.origNext && d.origNext.parentNode === grid ? d.origNext : null));
  const r = d.card.getBoundingClientRect();
  d.ghost.classList.add('landing');
  Object.assign(d.ghost.style, { left: r.left + 'px', top: r.top + 'px' });
  setTimeout(() => { d.ghost.remove(); d.card.classList.remove('placeholder'); }, 180);
  document.body.classList.remove('g-dragging');
  // клик после перетаскивания не должен сворачивать группу
  const eat = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
  window.addEventListener('click', eat, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', eat, { capture: true }), 0);
  document.querySelectorAll('.board-tab.drop-into').forEach((x) => x.classList.remove('drop-into'));
  const g = findGroup(d.card.dataset.gid);
  if (!cancel && d.tab && g) { // бросили на вкладку другого стола
    if (d.origNext && d.origNext.parentNode === grid) grid.insertBefore(d.card, d.origNext);
    moveGroupToBoard(g, d.tab);
    return;
  }
  const order = Array.from(grid.children).map((c) => c.dataset.gid);
  const vis = visibleGroups();
  if (order.length === vis.length && order.some((id, i) => vis[i].id !== id)) {
    const pos = vis.map((x) => state.groups.indexOf(x));
    const sorted = order.map(findGroup); // сначала собрать, потом раскладывать — иначе затрём ещё не переставленные
    pos.forEach((p, i) => { state.groups[p] = sorted[i]; });
    save(false); // DOM уже в нужном порядке — не перерисовываем, чтобы виджеты не перезагружались
  }
}
// ширина группы: тянем за правый край
function startResize(e, g, card) {
  if (state.settings.lock || e.button !== 0) return;
  e.preventDefault(); e.stopPropagation();
  const grid = $('#grid');
  const colW = (grid.getBoundingClientRect().width + GAP) / cols;
  const left = card.getBoundingClientRect().left;
  const startSpan = g.span >= 4 ? cols : Math.min(g.span || 1, cols);
  let span = startSpan;
  card.classList.add('resizing');
  document.body.classList.add('g-resizing');
  const badge = h('span', { class: 'resize-badge' });
  card.firstElementChild.append(badge);
  const paint = () => { badge.textContent = span >= cols ? t('wFull') : `${span} / ${cols}`; };
  paint();
  const move = (ev) => {
    const n = clamp(Math.round((ev.clientX - left + GAP) / colW), 1, cols);
    if (n === span) return;
    flip(() => { span = n; card.style.gridColumn = `span ${n}`; });
    paint();
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    card.classList.remove('resizing');
    document.body.classList.remove('g-resizing');
    badge.remove();
    if (span === startSpan) return;
    // до упора вправо = «во всю ширину», чтобы на широком экране группа тоже растягивалась
    g.span = span >= cols ? 4 : Math.min(span, 3);
    save(false);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

// ---------- рабочие столы (вкладки над сеткой) ----------
// какой стол открыт — своё на каждом устройстве, сами столы синхронизируются
let board = null;
function curBoard() {
  if (!board || !state.boards.some((b) => b.id === board)) {
    let saved = null;
    try { saved = localStorage.getItem('rdb2_board'); } catch {}
    board = state.boards.some((b) => b.id === saved) ? saved : state.boards[0].id;
  }
  return board;
}
const onBoard = (g) => g.board === curBoard();
function visibleGroups() { return state.groups.filter(onBoard); }
function boardName(b) { return b.title || t('board') + ' ' + (state.boards.indexOf(b) + 1); }
function setBoard(id) {
  if (id === curBoard()) return;
  board = id;
  try { localStorage.setItem('rdb2_board', id); } catch {}
  window.scrollTo(0, 0);
  render();
}
function stepBoard(d) {
  const i = state.boards.findIndex((b) => b.id === curBoard());
  const n = state.boards[(i + d + state.boards.length) % state.boards.length];
  if (n) setBoard(n.id);
}
function renderBoards() {
  const nav = $('#boards');
  if (state.boards.length < 2) { nav.hidden = true; nav.replaceChildren(); return; }
  nav.hidden = false;
  nav.replaceChildren(...state.boards.map((b, i) => {
    const n = visibleCount(b.id);
    const tab = h('button', { class: 'board-tab' + (b.id === curBoard() ? ' on' : ''), 'data-bid': b.id, title: boardName(b) + (i < 9 ? ` (${i + 1})` : '') },
      h('span', { text: boardName(b) }), n ? h('small', { text: n }) : null);
    tab.addEventListener('click', () => setBoard(b.id));
    tab.addEventListener('dblclick', () => { if (!state.settings.lock) openBoardDialog({ b }); });
    tab.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); openMenuAt(e.clientX, e.clientY, boardMenu(b)); });
    return tab;
  }), state.settings.lock ? '' : h('button', { class: 'board-tab add', title: t('addBoard'), html: svg('plus'), onclick: () => openBoardDialog({}) }));
}
function visibleCount(id) { return state.groups.filter((g) => g.board === id).length; }
function boardMenu(b) {
  const i = state.boards.indexOf(b);
  const mv = (d) => { state.boards.splice(i, 1); state.boards.splice(i + d, 0, b); save(); };
  return [
    { icon: 'edit', label: t('rename'), run: () => openBoardDialog({ b }) },
    i > 0 ? { icon: 'left', label: t('moveLeft'), run: () => mv(-1) } : null,
    i < state.boards.length - 1 ? { icon: 'right', label: t('moveRight'), run: () => mv(1) } : null,
    { icon: 'plus', label: t('addBoard'), run: () => openBoardDialog({}) },
    state.boards.length > 1 ? { sep: true } : null,
    state.boards.length > 1 ? { icon: 'trash', label: t('del'), danger: true, run: () => removeBoard(b) } : null,
  ].filter(Boolean);
}
function openBoardDialog({ b }) {
  const title = h('input', { type: 'text', maxLength: 30, value: b ? b.title : '', placeholder: b ? boardName(b) : t('boardPh') });
  const parts = [field(t('title'), title)];
  if (!b && state.boards.length === 1) parts.push(h('p', { class: 'muted', text: t('boardFirst') }));
  openDialog(b ? boardName(b) : t('addBoard'), h('div', { class: 'stack' }, ...parts), {
    onSave: () => {
      if (b) { b.title = title.value.trim(); save(); return; }
      // первый «второй» стол: у текущего тоже появляется имя, иначе вкладки «Стол 1 / Стол 2»
      if (state.boards.length === 1 && !state.boards[0].title) state.boards[0].title = t('boardMain');
      const nb = { id: uid(), title: title.value.trim() };
      state.boards.push(nb);
      board = nb.id;
      try { localStorage.setItem('rdb2_board', nb.id); } catch {}
      save();
    },
  });
}
function removeBoard(b) {
  const bi = state.boards.indexOf(b);
  if (bi < 0 || state.boards.length < 2) return;
  const gone = state.groups.map((g, i) => [g, i]).filter(([g]) => g.board === b.id);
  state.boards.splice(bi, 1);
  state.groups = state.groups.filter((g) => g.board !== b.id);
  if (board === b.id) board = null;
  save();
  toast(t('deleted') + ': ' + boardName(b), t('undo'), () => {
    state.boards.splice(bi, 0, b);
    gone.forEach(([g, i]) => state.groups.splice(Math.min(i, state.groups.length), 0, g));
    save();
  });
}
function moveGroupToBoard(g, bid) {
  state.groups.splice(state.groups.indexOf(g), 1);
  g.board = bid;
  state.groups.push(g);
  save();
  toast(t('movedTo', boardName(state.boards.find((b) => b.id === bid))), t('open'), () => setBoard(bid));
}

// ---------- клавиатура: пробел — буквы на ссылках, набери и перейди ----------
const HINT_KEYS = 'asdfghjklqwertyuiopzxcvbnm';
let hints = null;
function hintLabels(n) {
  if (n <= HINT_KEYS.length) return HINT_KEYS.slice(0, n).split('');
  const out = [];
  for (const a of HINT_KEYS) for (const b of HINT_KEYS) { out.push(a + b); if (out.length >= n) return out; }
  return out;
}
function startHints() {
  const links = Array.from(document.querySelectorAll('#grid .lnk, #grid .feed, #grid .rel')).filter((a) => {
    const r = a.getBoundingClientRect();
    return r.width && r.bottom > 0 && r.top < window.innerHeight; // только то, что видно на экране
  });
  if (!links.length && state.boards.length < 2) return;
  const labels = hintLabels(links.length);
  hints = { typed: '', items: links.map((a, i) => {
    const tag = h('span', { class: 'hint', text: labels[i] });
    a.append(tag);
    return { a, key: labels[i], tag };
  }) };
  document.body.classList.add('hinting');
}
function stopHints() {
  if (!hints) return;
  hints.items.forEach((x) => x.tag.remove());
  hints = null;
  document.body.classList.remove('hinting');
}
function hintKey(e) {
  if (e.key === 'Escape' || e.key === ' ') { stopHints(); return; }
  if (e.key === 'Backspace') { hints.typed = hints.typed.slice(0, -1); }
  else if (/^[1-9]$/.test(e.key) && !hints.typed) { const b = state.boards[+e.key - 1]; stopHints(); if (b) setBoard(b.id); return; }
  else if (e.key.length === 1 && HINT_KEYS.includes(e.key.toLowerCase())) hints.typed += e.key.toLowerCase();
  else if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) { stopHints(); return; }
  else return;
  const hit = hints.items.find((x) => x.key === hints.typed);
  if (hit) {
    const newTab = e.shiftKey || e.ctrlKey || e.metaKey || hit.a.target === '_blank';
    const href = hit.a.href;
    stopHints();
    if (newTab) window.open(href, '_blank', 'noopener'); else location.href = href;
    return;
  }
  let any = false;
  hints.items.forEach((x) => {
    const ok = x.key.startsWith(hints.typed);
    any = any || ok;
    x.tag.hidden = !ok;
    x.tag.innerHTML = ok ? `<b>${hints.typed}</b>${x.key.slice(hints.typed.length)}` : '';
  });
  if (!any) stopHints();
}
window.addEventListener('keydown', (e) => {
  if (hints) { e.preventDefault(); e.stopPropagation(); hintKey(e); return; }
  if (dlg.open || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable],.todo-txt')) return;
  if (e.key === ' ' && !e.repeat) { e.preventDefault(); e.stopPropagation(); closeMenu(); startHints(); }
  else if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && state.boards.length > 1) { e.preventDefault(); stepBoard(e.key === 'ArrowLeft' ? -1 : 1); }
}, true);
document.addEventListener('mousedown', stopHints);
window.addEventListener('scroll', () => { if (hints) stopHints(); }, { passive: true });

// ---------- меню ----------
function openMenu(anchor, items) { const r = anchor.getBoundingClientRect(); openMenuAt(r.right, r.bottom + 4, items, true); }
function openMenuAt(x, y, items, alignRight) {
  document.querySelectorAll('.menu.sub').forEach((x) => x.remove());
  const m = $('#menu');
  m.replaceChildren(...buildMenu(items));
  m.hidden = false;
  const mw = m.offsetWidth, mh = m.offsetHeight;
  let left = alignRight ? x - mw : x, top = y;
  left = clamp(left, 8, window.innerWidth - mw - 8);
  if (top + mh > window.innerHeight - 8) top = Math.max(8, y - mh);
  m.style.left = left + 'px'; m.style.top = top + 'px';
}
function buildMenu(items) {
  return items.map((it) => {
    if (it.sep) return h('div', { class: 'menu-sep' });
    // пункт с подменю — не кнопка: вложенные кнопки ломают клики
    const b = h(it.sub ? 'div' : 'button', { class: 'menu-item' + (it.danger ? ' danger' : '') + (it.checked ? ' checked' : '') + (it.sub ? ' has-sub' : ''), tabIndex: 0 },
      h('span', { class: 'mi-ic', html: it.icon ? svg(it.icon) : '' }), h('span', { text: it.label }),
      it.sub ? h('span', { class: 'mi-arrow', html: svg('move') }) : it.checked ? h('span', { class: 'mi-arrow', html: svg('check') }) : null);
    b.addEventListener('mouseenter', () => {
      if (b.closest('.menu.sub') || it.sub) return;
      document.querySelectorAll('.has-sub.open').forEach((x) => x.classList.remove('open'));
      document.querySelectorAll('.menu.sub').forEach((x) => x.remove());
    });
    if (it.sub) {
      // подменю живёт в body: у меню есть backdrop-filter, внутри него position: fixed считается от меню
      const sub = h('div', { class: 'menu sub' }, ...buildMenu(it.sub));
      const open = () => {
        document.querySelectorAll('.menu.sub').forEach((x) => { if (x !== sub) x.remove(); });
        document.querySelectorAll('.has-sub.open').forEach((x) => { if (x !== b) x.classList.remove('open'); });
        b.classList.add('open');
        if (!sub.isConnected) document.body.append(sub);
        placeSub(b, sub);
      };
      b.addEventListener('mouseenter', open);
      b.addEventListener('click', (e) => { e.stopPropagation(); open(); });
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'ArrowRight') { open(); sub.querySelector('.menu-item')?.focus(); } });
    } else b.addEventListener('click', (e) => { e.stopPropagation(); closeMenu(); it.run && it.run(); });
    return b;
  });
}
// подменю на position: fixed — всегда целиком в окне, с какой стороны бы ни открылось
function placeSub(item, sub) {
  const r = item.getBoundingClientRect();
  sub.style.maxHeight = (window.innerHeight - 16) + 'px';
  const w = sub.offsetWidth, hh = sub.offsetHeight;
  let left = r.right + 4;
  if (left + w > window.innerWidth - 8) left = r.left - w - 4;
  let top = r.top - 6;
  if (top + hh > window.innerHeight - 8) top = window.innerHeight - 8 - hh;
  sub.style.left = Math.max(8, left) + 'px';
  sub.style.top = Math.max(8, top) + 'px';
}
function closeMenu() { $('#menu').hidden = true; document.querySelectorAll('.menu.sub').forEach((x) => x.remove()); }
document.addEventListener('mousedown', (e) => { if (!e.target.closest('#menu, .menu.sub')) closeMenu(); });
window.addEventListener('blur', closeMenu);
document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('input,textarea,.todo-txt,dialog,.results')) return;
  e.preventDefault();
  openMenuAt(e.clientX, e.clientY, addItems());
});
function addItems() {
  return [
    { icon: 'link', label: t('addLink'), run: () => openLinkDialog({}) },
    { icon: 'group', label: t('addGroup'), run: () => openGroupDialog({ kind: 'links' }) },
    { icon: 'tiles', label: t('addBoard'), run: () => openBoardDialog({}) },
    { icon: 'widget', label: t('addWidget'), sub: R.WIDGETS.map((k) => ({ icon: kindIcon(k), label: kName(k), run: () => openGroupDialog({ kind: k }) })) },
    { sep: true },
    { icon: 'gear', label: t('settings'), run: openSettings },
  ];
}

// ---------- тосты ----------
function toast(msg, actLabel, act) {
  const el = h('div', { class: 'toast' }, h('span', { text: msg }));
  if (actLabel) el.append(h('button', { text: actLabel, onclick: () => { el.remove(); act(); } }));
  $('#toasts').append(el);
  setTimeout(() => el.classList.add('out'), 4500);
  setTimeout(() => el.remove(), 5000);
}

// ---------- диалоги ----------
const dlg = $('#dlg');
function openDialog(title, body, { onSave, saveLabel, wide, extraBtn, noFocus } = {}) {
  const form = h('form', { class: 'dlg-form' + (wide ? ' wide' : ''), method: 'dialog' });
  form.append(h('div', { class: 'dlg-head' }, h('h2', { text: title }), h('button', { type: 'button', class: 'tool', html: svg('x'), onclick: () => dlg.close() })));
  form.append(h('div', { class: 'dlg-body' }, body));
  const foot = h('div', { class: 'dlg-foot' });
  if (extraBtn) foot.append(extraBtn, h('span', { class: 'grow' }));
  else foot.append(h('span', { class: 'grow' }));
  foot.append(h('button', { type: 'button', class: 'btn ' + (onSave ? 'ghost' : 'primary'), text: onSave ? t('cancel') : t('done'), onclick: () => dlg.close() }));
  if (onSave) foot.append(h('button', { type: 'submit', class: 'btn primary', text: saveLabel || t('save') }));
  form.append(foot);
  form.addEventListener('submit', (e) => { e.preventDefault(); if (onSave && onSave() !== false) dlg.close(); });
  dlg.replaceChildren(form);
  dlg.className = wide ? 'wide' : '';
  if (!dlg.open) dlg.showModal();
  const first = form.querySelector('input:not([type=checkbox]):not([type=file]),select,textarea');
  if (first && !noFocus) setTimeout(() => first.focus(), 30);
  return form;
}
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
const field = (label, input, cls) => h('label', { class: 'field ' + (cls || '') }, h('span', { class: 'field-l', text: label }), input);
function select(opts, value) {
  const s = h('select');
  opts.forEach(([v, l]) => s.append(h('option', { value: v, text: l, selected: String(v) === String(value) })));
  return s;
}
function seg(opts, value, onChange) {
  const box = h('div', { class: 'seg' });
  box.value = value;
  opts.forEach(([v, l, icn]) => {
    const b = h('button', { type: 'button', class: String(v) === String(value) ? 'on' : '', html: (icn ? svg(icn) : '') + `<span>${l}</span>` });
    b.addEventListener('click', () => { box.value = v; box.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); onChange && onChange(v); });
    box.append(b);
  });
  return box;
}

function openLinkDialog({ link, groupId, url: preUrl }) {
  const editing = !!link;
  const cur = link ? findLink(link.id) : null;
  const data = { url: link?.url || preUrl || '', title: link?.title || '', desc: link?.desc || '', icon: link?.icon || '' };
  let titleTouched = editing, descTouched = editing && !!link.desc;
  const url = h('input', { type: 'text', inputMode: 'url', placeholder: 'https://… / 192.168.1.10:8006', value: data.url, required: true });
  const title = h('input', { type: 'text', maxLength: 60, value: data.title, placeholder: t('title') });
  const desc = h('input', { type: 'text', maxLength: 90, value: data.desc, placeholder: t('descPh') });
  const groups = linkGroups();
  const gsel = select(groups.length ? groups.map((g) => [g.id, g.title || t('untitled')]) : [['__new', t('inbox')]], cur ? cur.g.id : (groupId || groups[0]?.id));
  const status = h('span', { class: 'fetching', hidden: true, text: t('fetching') });
  const preview = h('div', { class: 'prev' });
  const paintPreview = () => {
    const l = { url: R.normalizeUrl(url.value), title: title.value || R.titleFromUrl(R.normalizeUrl(url.value)), icon: data.icon };
    preview.replaceChildren(iconBox(l, 'ic big'), h('div', { class: 'prev-t' }, h('b', { text: l.title || '…' }), h('span', { text: desc.value || l.url || '' })));
  };
  // --- выбор иконки ---
  const iconTabs = h('div', { class: 'icon-pick' });
  const q = h('input', { type: 'text', placeholder: t('iconSearch') });
  const res = h('div', { class: 'icon-res' });
  const fillRes = () => {
    const app = R.guessApp(R.normalizeUrl(url.value), title.value);
    const found = q.value.trim() ? R.searchIcons(q.value, 36) : (app ? [app, ...R.searchIcons(app.name.split('-')[0], 12).filter((r) => r.name !== app.name)] : []);
    const autoBtn = h('button', { type: 'button', class: 'ipick auto' + (!data.icon ? ' on' : ''), title: t('iconAuto'), text: t('iconAuto'), onclick: () => { data.icon = ''; fillRes(); paintPreview(); } });
    res.replaceChildren(autoBtn, ...found.map((r) => {
      const ref = R.iconRef(r);
      const b = h('button', { type: 'button', class: 'ipick' + (data.icon === ref ? ' on' : ''), title: r.name, onclick: () => { data.icon = ref; fillRes(); paintPreview(); } },
        h('img', { src: R.iconRecUrl(r), alt: r.name, loading: 'lazy', onerror: (e) => e.target.parentElement.remove() }));
      return b;
    }));
  };
  q.addEventListener('input', fillRes);
  const iconUrl = h('input', { type: 'text', placeholder: 'https://…/icon.svg', value: /^https?:/.test(data.icon) ? data.icon : '' });
  iconUrl.addEventListener('input', () => { data.icon = iconUrl.value.trim(); paintPreview(); });
  const iconFile = h('input', { type: 'file', accept: 'image/*', hidden: true });
  iconFile.addEventListener('change', async () => { const f = iconFile.files[0]; if (!f) return; data.icon = await fileToDataUrl(f, 128); paintPreview(); });
  const emoji = h('input', { type: 'text', maxLength: 4, placeholder: '🚀', value: data.icon.startsWith('txt:') ? data.icon.slice(4) : '', class: 'emoji-in' });
  emoji.addEventListener('input', () => { data.icon = emoji.value.trim() ? 'txt:' + emoji.value.trim() : ''; paintPreview(); });
  iconTabs.append(q, res, h('div', { class: 'icon-row' }, iconUrl, h('button', { type: 'button', class: 'btn ghost sm', text: t('upload'), onclick: () => iconFile.click() }), emoji, iconFile));

  let ctl = null, tmr = 0;
  const autofill = () => {
    clearTimeout(tmr);
    paintPreview(); fillRes();
    const u = R.normalizeUrl(url.value);
    if (!u || !R.parseUrl(u)) return;
    if (!titleTouched) { title.value = R.titleFromUrl(u); paintPreview(); }
    if (titleTouched && descTouched) return;
    tmr = setTimeout(async () => {
      if (ctl) ctl.abort();
      ctl = new AbortController();
      status.hidden = false;
      const m = await R.fetchMeta(u, ctl.signal);
      status.hidden = true;
      if (!m || R.normalizeUrl(url.value) !== u) return;
      if (!titleTouched && m.title && !R.guessApp(u, '')) title.value = m.title;
      if (!descTouched && m.desc) desc.value = m.desc;
      paintPreview(); fillRes();
    }, 450);
  };
  url.addEventListener('input', autofill);
  title.addEventListener('input', () => { titleTouched = true; paintPreview(); });
  desc.addEventListener('input', () => { descTouched = true; paintPreview(); });

  const pingSel = select([['auto', t('pingAuto')], ['on', t('pingOn')], ['off', t('pingNever')]], link?.ping === true ? 'on' : link?.ping === false ? 'off' : 'auto');
  const body = h('div', { class: 'stack' }, preview, field(t('url'), url), h('div', { class: 'row2' }, field(t('title'), title), field(t('group'), gsel)),
    h('div', { class: 'row2' }, field(t('desc'), desc), field(t('pingLink'), pingSel)), status,
    h('div', { class: 'field' }, h('span', { class: 'field-l', text: t('icon') }), iconTabs));
  openDialog(editing ? t('editLink') : t('newLink'), body, {
    extraBtn: editing ? h('button', { type: 'button', class: 'btn ghost danger', html: svg('trash'), title: t('del'), onclick: () => { dlg.close(); removeLink(link.id); } }) : null,
    onSave: () => {
      const u = R.normalizeUrl(url.value);
      if (!u) { url.focus(); return false; }
      const vals = { url: u, title: title.value.trim() || R.titleFromUrl(u), desc: desc.value.trim(), icon: data.icon,
        ping: pingSel.value === 'on' ? true : pingSel.value === 'off' ? false : undefined };
      let target = gsel.value === '__new' ? ensureLinkGroup() : findGroup(gsel.value);
      if (editing) {
        const f = findLink(link.id);
        if (!f) return;
        if (vals.url !== f.l.url || vals.title !== f.l.title || vals.icon !== f.l.icon) delete cache.c.icon[iconKey(f.l)];
        Object.assign(f.l, vals);
        if (!vals.desc) delete f.l.desc;
        if (!vals.icon) delete f.l.icon;
        if (vals.ping === undefined) delete f.l.ping;
        if (target && target !== f.g) { f.g.items.splice(f.i, 1); target.items.push(f.l); }
      } else {
        const l = { id: uid(), ...vals };
        if (!l.desc) delete l.desc;
        if (!l.icon) delete l.icon;
        if (l.ping === undefined) delete l.ping;
        (target || ensureLinkGroup()).items.push(l);
      }
      save();
    },
  });
  paintPreview(); fillRes();
  if (preUrl && !editing) autofill();
}

function openGroupDialog({ group, kind }) {
  const editing = !!group;
  const g = group ? JSON.parse(JSON.stringify(group)) : R.newGroup(kind || 'links');
  const title = h('input', { type: 'text', maxLength: 40, value: g.title || '', placeholder: kName(g.kind) });
  const span = seg([[1, '1'], [2, '2'], [3, '3'], [4, t('wFull')]], g.span || 1);
  const parts = [field(t('title'), title), field(t('width'), span)];
  let view = null, srv = null, city, days, hours, base, syms, cmp, coins, zones, events, feed, count, purl, height, repos;
  const rangeField = (label, min, max, step, val) => {
    const r = h('input', { type: 'range', min, max, step, value: val });
    const v = h('b', { text: r.value });
    r.oninput = () => { v.textContent = r.value; };
    return [r, field(label, h('div', { class: 'range' }, r, v))];
  };
  if (g.kind === 'links') { view = seg([['tiles', t('vTiles'), 'tiles'], ['list', t('vList'), 'list'], ['compact', t('vCompact'), 'compact']], g.view); parts.push(field(t('view'), view)); }
  if (g.kind === 'weather') {
    city = h('input', { type: 'text', value: g.city || '', placeholder: R.lang() === 'ru' ? 'Одесса' : 'London', required: true });
    days = h('input', { type: 'range', min: 0, max: 7, step: 1, value: g.days || 0 });
    hours = h('input', { type: 'range', min: 0, max: 24, step: 3, value: g.hours || 0 });
    const dv = h('b', { text: days.value }), hv = h('b', { text: hours.value });
    days.oninput = () => { dv.textContent = days.value; }; hours.oninput = () => { hv.textContent = hours.value; };
    parts.push(field(t('city'), city), h('div', { class: 'row2' }, field(t('days'), h('div', { class: 'range' }, days, dv)), field(t('hours'), h('div', { class: 'range' }, hours, hv))));
  }
  if (g.kind === 'currency') {
    base = select(CURRENCIES.map((c) => [c, c]), g.base);
    syms = h('div', { class: 'chips' });
    CURRENCIES.forEach((c) => {
      const b = h('button', { type: 'button', class: 'chip' + ((g.symbols || []).includes(c) ? ' on' : ''), text: c, onclick: () => b.classList.toggle('on') });
      syms.append(b);
    });
    cmp = seg([[1, t('cmp1')], [7, t('cmp7')], [30, t('cmp30')]], g.cmp || 1);
    parts.push(field(t('base'), base), field(t('symbols'), syms), field(t('cmp'), cmp));
  }
  if (g.kind === 'crypto') { coins = h('input', { type: 'text', value: (g.coins || []).join(', '), placeholder: 'BTC, ETH, SOL' }); parts.push(field(t('coins'), coins)); }
  if (g.kind === 'clock') {
    zones = h('input', { type: 'text', value: (g.zones || []).join(', '), placeholder: t('zonesHint') });
    parts.push(field(t('zones'), zones), h('p', { class: 'muted', text: (R.lang() === 'ru' ? 'Своё имя: Дом=Europe/Kyiv. Твой пояс: ' : 'Custom label: Home=Europe/Berlin. Yours: ') + Intl.DateTimeFormat().resolvedOptions().timeZone }));
  }
  if (g.kind === 'countdown') {
    events = h('textarea', { rows: 4, value: (g.events || []).map((e) => e.date + ' ' + e.title).join('\n'), placeholder: new Date().getFullYear() + '-12-31 ' + (R.lang() === 'ru' ? 'Новый год' : 'New Year') });
    parts.push(field(t('events'), events));
  }
  if (g.kind === 'rss') {
    feed = h('input', { type: 'text', inputMode: 'url', value: g.feed || '', placeholder: 'https://example.com/feed.xml', required: true });
    let cr; [count, cr] = rangeField(t('count'), 1, 20, 1, g.count || 6);
    parts.push(field(t('feed'), feed), cr);
  }
  if (g.kind === 'iframe') {
    purl = h('input', { type: 'text', inputMode: 'url', value: g.url || '', placeholder: 'https://status.example.com', required: true });
    let hr; [height, hr] = rangeField(t('height'), 150, 900, 10, g.height || 320);
    parts.push(field(t('pageUrl'), purl), hr, h('p', { class: 'muted', text: t('noFrame') }));
  }
  if (g.kind === 'server') {
    const sec = secretOf(g);
    const surl = h('input', { type: 'text', inputMode: 'url', value: g.url || '', required: true });
    const key = h('input', { type: 'password', value: sec.token || '', autocomplete: 'off', spellcheck: false, placeholder: 'root@pam!rdb=xxxxxxxx-xxxx-…' });
    const hint = h('p', { class: 'muted' });
    const keyF = field(t('pveToken'), key);
    const PH = { glances: 'http://192.168.1.10:61208', netdata: 'http://192.168.1.10:19999', proxmox: 'https://192.168.1.2:8006' };
    const paint = () => {
      const w = srv.type.value;
      surl.placeholder = PH[w];
      keyF.hidden = w !== 'proxmox';
      hint.textContent = t('h_' + w) + (w === 'proxmox' ? ' ' + t('secretNote') : '');
    };
    srv = { surl, key, type: seg([['glances', 'Glances'], ['netdata', 'Netdata'], ['proxmox', 'Proxmox']], g.source || 'glances', () => paint()) };
    parts.push(field(t('source'), srv.type), field(t('url'), surl), keyF, hint);
    paint();
  }
  if (g.kind === 'github') { repos = h('input', { type: 'text', value: (g.repos || []).join(', '), placeholder: 'immich-app/immich, jellyfin/jellyfin' }); parts.push(field(t('repos'), repos)); }
  if (g.kind === 'topsites') { let cr; [count, cr] = rangeField(t('count'), 4, 24, 1, g.count || 8); parts.push(cr); }
  openDialog(editing ? (g.title || kName(g.kind)) : kName(g.kind), h('div', { class: 'stack' }, ...parts), {
    extraBtn: editing ? h('button', { type: 'button', class: 'btn ghost danger', html: svg('trash'), title: t('del'), onclick: () => { dlg.close(); removeGroup(group); } }) : null,
    onSave: () => {
      const tgt = group || g;
      tgt.title = title.value.trim() || (editing ? '' : kName(g.kind));
      tgt.span = +span.value || 1;
      if (view) tgt.view = view.value;
      if (city) { if (!city.value.trim()) { city.focus(); return false; } tgt.city = city.value.trim(); tgt.days = +days.value; tgt.hours = +hours.value; }
      if (base) { tgt.base = base.value; tgt.symbols = Array.from(syms.querySelectorAll('.chip.on')).map((x) => x.textContent); tgt.cmp = +cmp.value || 1; }
      if (coins) tgt.coins = coins.value.split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
      if (feed) {
        const u = R.normalizeUrl(feed.value);
        if (!u) { feed.focus(); return false; }
        askOrigin(u).then(() => render()); // спрашиваем доступ, пока есть жест пользователя
        if (u !== tgt.feed && cache.c.rss) delete cache.c.rss[u];
        tgt.feed = u;
      }
      if (purl) {
        const u = R.normalizeUrl(purl.value);
        if (!u) { purl.focus(); return false; }
        // доступ спрашиваем сразу, пока есть жест пользователя — тогда встраивание заработает с первого раза
        if (embedUrl(u) === u) askOrigin(u).then((ok) => ok && allowFraming(u)).then(() => render());
        tgt.url = u; tgt.height = +height.value;
      }
      if (srv) {
        const u = (R.normalizeUrl(srv.surl.value) || '').replace(/\/+$/, '');
        if (!u) { srv.surl.focus(); return false; }
        const w = srv.type.value;
        tgt.url = u;
        tgt.source = w;
        if (!title.value.trim()) tgt.title = { glances: R.lang() === 'ru' ? 'Сервер' : 'Server', netdata: 'Netdata', proxmox: 'Proxmox' }[w];
        const tok = w === 'proxmox' ? srv.key.value.trim() : '';
        if (tok) secrets[tgt.id] = { token: tok }; else delete secrets[tgt.id];
        saveSecrets();
        // доступ спрашиваем, пока есть клик пользователя
        askOrigin(u).then((ok) => ok && allowFraming(u)).then(() => render());
      }
      if (count) tgt.count = +count.value;
      if (zones) tgt.zones = zones.value.split(',').map((z) => z.trim()).filter((z) => parseZone(z));
      if (events) tgt.events = events.value.split('\n').map((l) => /^\s*(\d{4}-\d{2}-\d{2})\s+(.+)$/.exec(l)).filter(Boolean).map((m) => ({ date: m[1], title: m[2].trim() }));
      if (repos) tgt.repos = repos.value.split(/[\s,;]+/).map((r) => r.trim()).filter(Boolean);
      if (g.kind === 'topsites' && ext && ext.permissions) ext.permissions.request({ permissions: ['topSites'] }).then((ok) => ok && render()).catch(() => {});
      if (!editing) { tgt.board = curBoard(); state.groups.push(tgt); }
      save();
      if (!editing) requestAnimationFrame(() => $(`[data-gid="${tgt.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    },
  });
}

// ---------- настройки ----------
const ENGINES = {
  google: ['Google', 'https://www.google.com/search?q=%s'], duck: ['DuckDuckGo', 'https://duckduckgo.com/?q=%s'],
  bing: ['Bing', 'https://www.bing.com/search?q=%s'], yandex: ['Яндекс', 'https://yandex.ru/search/?text=%s'],
  brave: ['Brave', 'https://search.brave.com/search?q=%s'], startpage: ['Startpage', 'https://www.startpage.com/do/search?q=%s'],
  perplexity: ['Perplexity', 'https://www.perplexity.ai/search?q=%s'], custom: [t('sEngineCustom'), ''],
};
function openSettings() {
  const s = state.settings;
  const live = () => { save(); applySettings(); };
  const chk = (key, label, after) => {
    const c = h('input', { type: 'checkbox', checked: !!s[key] });
    c.addEventListener('change', () => { s[key] = c.checked; live(); after && after(); });
    return h('label', { class: 'switch' }, c, h('i'), h('span', { text: label }));
  };
  // вид
  const name = h('input', { type: 'text', value: s.name, placeholder: t('sNamePh'), maxLength: 30 });
  name.addEventListener('input', () => { s.name = name.value; save(false); tick(); });
  const accents = h('div', { class: 'swatches' }, ...R.ACCENTS.map((c) => {
    const b = h('button', { type: 'button', class: 'sw' + (s.accent === c ? ' on' : ''), style: { background: c } });
    b.addEventListener('click', () => { s.accent = c; accents.querySelectorAll('.sw').forEach((x) => x.classList.toggle('on', x === b)); live(); });
    return b;
  }));
  const look = h('section', { class: 'set' }, h('h3', { text: t('sLook') }),
    chk('showClock', t('sClock')), field(t('sName'), name), chk('showSearch', t('sSearch')), chk('showDesc', t('sDesc')),
    field(t('sTheme'), seg([['dark', t('thDark')], ['light', t('thLight')], ['auto', t('thAuto')]], s.theme || 'dark', (v) => { s.theme = v; live(); showBgFilters(); })),
    field(t('sAccent'), accents),
    field(t('sDensity'), seg([['comfortable', t('dComfort')], ['compact', t('dCompact')]], s.density, (v) => { s.density = v; live(); })),
    field(t('sMaxw'), seg([['normal', t('mwNormal')], ['wide', t('mwWide')], ['full', t('mwFull')]], s.maxw, (v) => { s.maxw = v; live(); })),
    field(t('sCols'), seg([[0, t('colsAuto')], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']], s.cols, (v) => { s.cols = +v; live(); })));
  // фон
  const b = s.bg;
  const bgBox = h('div', { class: 'stack' });
  const paintBgBox = () => {
    const kids = [];
    if (b.mode === 'curated' || b.mode === 'custom') {
      kids.push(h('div', { class: 'row2' },
        field(t('bgChange'), (() => { const x = select([[0, t('int0')], [15, t('int15')], [60, t('int60')], [1440, t('int1440')], [-1, t('intNever')]], b.interval); x.onchange = () => { b.interval = +x.value; save(false); showBg(); }; return x; })()),
        h('button', { type: 'button', class: 'btn ghost', html: svg('refresh') + `<span>${t('bgNext')}</span>`, onclick: () => showBg(true) })));
    }
    if (b.mode === 'custom') {
      const ta = h('textarea', { rows: 3, value: (b.urls || []).join('\n'), placeholder: 'https://…' });
      ta.addEventListener('change', () => { b.urls = ta.value.split('\n').map((x) => x.trim()).filter(Boolean); bgLocal.url = null; save(false); showBg(); });
      kids.push(field(t('bgUrls'), ta));
    }
    if (b.mode === 'upload') {
      const f = h('input', { type: 'file', accept: 'image/*', hidden: true });
      f.addEventListener('change', async () => { if (!f.files[0]) return; await store.setBgFile(await fileToDataUrl(f.files[0])); showBg(); });
      kids.push(h('button', { type: 'button', class: 'btn ghost', text: t('pickFile'), onclick: () => f.click() }), f);
    }
    if (b.mode === 'color') {
      const inp = h('input', { type: 'text', value: b.color });
      inp.addEventListener('change', () => { b.color = inp.value; save(false); showBg(); });
      kids.push(h('div', { class: 'swatches' }, ...R.BG_PRESETS.map((c) => h('button', { type: 'button', class: 'sw wide', style: { background: c }, onclick: () => { b.color = c; inp.value = c; save(false); showBg(); } }))), inp);
    }
    const rng = (key, max, label) => {
      const r = h('input', { type: 'range', min: 0, max, step: 1, value: b[key] });
      const v = h('b', { text: b[key] });
      r.addEventListener('input', () => { b[key] = +r.value; v.textContent = r.value; showBgFilters(); save(false); });
      return field(label, h('div', { class: 'range' }, r, v));
    };
    kids.push(h('div', { class: 'row2' }, rng('blur', 20, t('blur')), rng('dim', 80, t('dim'))));
    bgBox.replaceChildren(...kids);
  };
  const bgSec = h('section', { class: 'set' }, h('h3', { text: t('sBg') }),
    seg([['curated', t('bgCurated')], ['custom', t('bgCustom')], ['upload', t('bgUpload')], ['color', t('bgColor')]], b.mode, (v) => { b.mode = v; save(false); paintBgBox(); showBg(); }),
    bgBox);
  paintBgBox();
  // поведение
  const eng = select(Object.entries(ENGINES).map(([k, [l]]) => [k, l]), s.engine);
  const engC = h('input', { type: 'text', value: s.engineCustom, placeholder: 'https://example.com/search?q=%s', hidden: s.engine !== 'custom' });
  eng.onchange = () => { s.engine = eng.value; engC.hidden = s.engine !== 'custom'; save(false); };
  engC.onchange = () => { s.engineCustom = engC.value.trim(); save(false); };
  const lang = select([['auto', t('langAuto')], ['ru', 'Русский'], ['en', 'English']], s.lang);
  lang.onchange = () => { s.lang = lang.value; R.setLang(s.lang); save(); applySettings(); tick(); openSettings(); };
  const beh = h('section', { class: 'set' }, h('h3', { text: t('sBehavior') }),
    h('div', { class: 'row2' }, field(t('sEngine'), eng), field(t('sLang'), lang)), engC,
    field(t('sPing'), seg([['off', t('pingOff')], ['local', t('pingLocal')], ['all', t('pingAll')]], s.ping || 'local', (v) => { s.ping = v; save(); })),
    field(t('sAlerts'), seg([['off', t('alOff')], ['badge', t('alBadge')], ['notify', t('alNotify')]], s.alerts || 'off', async (v) => {
      // уведомления — необязательное разрешение, спрашиваем прямо по клику
      if (v === 'notify' && ext && ext.permissions) {
        const ok = await ext.permissions.request({ permissions: ['notifications'] }).catch(() => false);
        if (!ok) { s.alerts = 'badge'; save(false); toast(t('alNoPerm')); openSettings(); return; }
      }
      s.alerts = v; save(false);
    })),
    h('p', { class: 'muted', text: t('alHint') }),
    chk('newTab', t('sNewTab')), chk('lock', t('sLock')), chk('sync', t('sSync')));
  // данные
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  file.addEventListener('change', () => importFile(file.files[0]));
  const data = h('section', { class: 'set' }, h('h3', { text: t('sData') }),
    h('div', { class: 'btns' },
      h('button', { type: 'button', class: 'btn ghost', text: t('exportJson'), onclick: exportJson }),
      h('button', { type: 'button', class: 'btn ghost', text: t('importJson'), onclick: () => file.click() }),
      h('button', { type: 'button', class: 'btn ghost', text: t('importBm'), onclick: importBookmarks }),
      h('button', { type: 'button', class: 'btn ghost danger', text: t('reset'), onclick: () => { if (confirm(t('confirmReset'))) { state = R.sanitize(R.defaultState()); board = null; save(); applySettings(); showBg(); openSettings(); } } }),
      file));
  const ver = (ext && ext.runtime && ext.runtime.getManifest) ? ext.runtime.getManifest().version : '2';
  const about = h('section', { class: 'set' }, h('h3', { text: t('sAbout') }), h('p', { class: 'muted', text: `R.Db ${ver} — ${t('about')}` }),
    h('p', { class: 'muted', text: t('keys') }),
    h('div', { class: 'btns' }, h('a', { class: 'btn ghost', href: 'https://github.com/DezFix/R.Db', target: '_blank', text: 'GitHub' }),
      h('a', { class: 'btn ghost', href: 'https://ko-fi.com/dezfix', target: '_blank', text: '☕ ' + t('support') })));
  openDialog(t('settings'), h('div', { class: 'settings' }, look, bgSec, beh, data, about), { wide: true, noFocus: true });
}
function showBgFilters() {
  const b = state.settings.bg;
  $('#dim').style.background = `rgba(${themeNow() === 'light' ? '236,239,245' : '6,8,12'},${b.dim / 100})`;
  document.documentElement.style.setProperty('--bg-blur', b.blur + 'px');
}
function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `rdb-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function importFile(f) {
  if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    const s = Array.isArray(j.groups) ? R.sanitize(j) : R.migrateV1(j);
    if (!s) throw new Error('bad');
    state = s;
    save(); applySettings(); showBg();
    dlg.close();
    toast(t('imported', state.groups.length));
  } catch { alert(t('importErr')); }
}
async function importBookmarks() {
  const api = ext && ext.permissions;
  try {
    const ok = api ? await api.request({ permissions: ['bookmarks'] }) : false;
    if (!ok || !ext.bookmarks) throw new Error('denied');
  } catch { toast(t('bmDenied')); return; }
  const tree = await ext.bookmarks.getTree();
  const folders = [];
  const walk = (n, depth) => {
    if (n.children) {
      const links = n.children.filter((c) => c.url && /^https?:/.test(c.url)).length;
      const deep = (function cnt(x) { return (x.children || []).reduce((a, c) => a + (c.url ? 1 : cnt(c)), 0); })(n);
      if (n.title && deep) folders.push({ n, depth, links, deep });
      n.children.forEach((c) => walk(c, depth + (n.title ? 1 : 0)));
    }
  };
  tree.forEach((n) => walk(n, 0));
  const list = h('div', { class: 'bm-list' });
  let pick = null;
  folders.forEach((f) => {
    const b = h('button', { type: 'button', class: 'bm', style: { paddingLeft: 10 + f.depth * 16 + 'px' } }, h('span', { text: '📁 ' + f.n.title }), h('small', { text: t('bmItems', f.deep) }));
    b.addEventListener('click', () => { pick = f.n; list.querySelectorAll('.bm').forEach((x) => x.classList.toggle('on', x === b)); });
    list.append(b);
  });
  openDialog(t('importBm'), h('div', { class: 'stack' }, h('p', { class: 'muted', text: t('bmPick') }), list), {
    saveLabel: t('bmImport'),
    onSave: () => {
      if (!pick) return false;
      const groups = [];
      const take = (node, prefix) => {
        const links = (node.children || []).filter((c) => c.url && /^https?:/.test(c.url)).slice(0, 200)
          .map((c) => ({ id: uid(), title: R.cleanTitle(c.title, c.url) || R.titleFromUrl(c.url), url: c.url }));
        const title = prefix ? prefix + ' / ' + node.title : node.title;
        if (links.length) groups.push({ id: uid(), kind: 'links', title, view: links.length > 8 ? 'compact' : 'tiles', span: 1, items: links });
        (node.children || []).filter((c) => c.children).forEach((c) => take(c, links.length ? title : prefix));
      };
      take(pick, '');
      groups.forEach((x) => { x.board = curBoard(); });
      state.groups.push(...groups.slice(0, 30));
      save();
      toast(t('imported', groups.reduce((a, g) => a + g.items.length, 0)));
    },
  });
}

// ---------- поиск ----------
let sel = 0, hits = [];
function engineUrl(q) {
  const s = state.settings;
  const tpl = s.engine === 'custom' && s.engineCustom.includes('%s') ? s.engineCustom : (ENGINES[s.engine] || ENGINES.google)[1];
  return tpl.replace('%s', encodeURIComponent(q));
}
function doSearch() {
  const q = $('#search').value.trim();
  const box = $('#results');
  if (!q) { box.hidden = true; hits = []; return; }
  const k = q.toLowerCase();
  const all = [];
  linkGroups().forEach((g) => g.items.forEach((l) => {
    const tt = l.title.toLowerCase(), u = l.url.toLowerCase().replace(/^https?:\/\/(www\.)?/, ''), d = (l.desc || '').toLowerCase();
    const score = tt.startsWith(k) ? 3 : tt.includes(k) ? 2 : u.includes(k) || d.includes(k) || g.title.toLowerCase().includes(k) ? 1 : 0;
    if (score) all.push({ l, g, score });
  }));
  all.sort((a, b) => b.score - a.score);
  hits = all.slice(0, 7).map((x) => ({ kind: 'link', ...x }));
  const looksUrl = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(q) || /^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?/.test(q);
  if (looksUrl) hits.push({ kind: 'url', url: R.normalizeUrl(q) });
  hits.push({ kind: 'web', q });
  sel = 0;
  box.replaceChildren(...hits.map((x, i) => {
    let row;
    if (x.kind === 'link') row = h('a', { class: 'res', href: x.l.url }, iconBox(x.l, 'ic sm'), h('span', { class: 'res-t', text: x.l.title }), h('span', { class: 'res-u', text: x.g.title }));
    else if (x.kind === 'url') row = h('a', { class: 'res', href: x.url }, h('span', { class: 'ic sm plain', html: svg('ext') }), h('span', { class: 'res-t', text: x.url }), h('span', { class: 'res-u', text: t('openLink') }));
    else row = h('a', { class: 'res', href: engineUrl(x.q) }, h('span', { class: 'ic sm plain', html: svg('search') }), h('span', { class: 'res-t', text: x.q }), h('span', { class: 'res-u', text: t('searchWeb') }));
    if (state.settings.newTab && x.kind === 'link') { row.target = '_blank'; row.rel = 'noopener'; }
    row.addEventListener('mousemove', () => { if (sel !== i) { sel = i; paintSel(); } });
    return row;
  }));
  box.hidden = false;
  paintSel();
}
function paintSel() { $('#results').querySelectorAll('.res').forEach((r, i) => r.classList.toggle('sel', i === sel)); }
function initSearch() {
  const inp = $('#search');
  inp.addEventListener('input', doSearch);
  inp.addEventListener('focus', doSearch);
  inp.addEventListener('blur', () => setTimeout(() => { $('#results').hidden = true; }, 150));
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(hits.length - 1, sel + 1); paintSel(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paintSel(); }
    else if (e.key === 'Escape') { inp.value = ''; doSearch(); inp.blur(); }
    else if (e.key === 'Enter') {
      const row = $('#results').querySelectorAll('.res')[sel];
      if (!row) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey || row.target === '_blank') window.open(row.href, '_blank', 'noopener'); else location.href = row.href;
    }
  });
  document.addEventListener('keydown', (e) => {
    if (dlg.open || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input,textarea,select,.todo-txt')) return;
    if (e.key === 'Escape') closeMenu();
    if (!state.settings.showSearch) return;
    if (e.key === '/') { e.preventDefault(); inp.focus(); }
    else if (e.key.length === 1 && /\S/.test(e.key)) { inp.focus(); } // просто начни печатать
  });
}

// ---------- вставка ссылки ----------
document.addEventListener('paste', (e) => {
  if (dlg.open || (e.target.closest && e.target.closest('input,textarea,.todo-txt'))) return;
  const txt = (e.clipboardData.getData('text') || '').trim();
  if (!/^(https?:\/\/|www\.)\S+$/i.test(txt) && !/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/\S*)?$/.test(txt)) return;
  e.preventDefault();
  const hovered = document.querySelector('.card:hover');
  const res = quickAdd(txt, hovered && hovered.dataset.gid);
  if (res) toast(t('added', res.g.title), t('edit'), () => openLinkDialog({ link: res.l }));
});

// ---------- входящие из попапа и меню ----------
async function mergeInbox() {
  const items = await store.takeInbox();
  if (!items.length) return;
  let last = null;
  items.forEach((it) => {
    if (!it.url) return;
    const res = quickAdd(it.url, it.groupId, { title: it.title, fav: it.fav });
    if (res && it.desc) res.l.desc = it.desc;
    if (res && it.icon) res.l.icon = it.icon;
    last = res;
  });
  if (last) { save(); toast(t('added', last.g.title)); }
}
if (ext && ext.storage && ext.storage.onChanged) {
  ext.storage.onChanged.addListener((ch, areaName) => {
    if (!state) return; // ещё грузимся
    if (areaName === 'local' && ch[store.keys.INBOX] && ch[store.keys.INBOX].newValue) mergeInbox();
    if (areaName === 'local' && ch[store.keys.KEY]) {
      const nv = ch[store.keys.KEY].newValue;
      if (nv && (+nv.ts || 0) > (+state.ts || 0) && !document.hasFocus()) { state = R.sanitize(nv); applySettings(); render(); }
    }
    if (areaName === 'sync' && ch[store.keys.SYNC_PREFIX + 'meta']) {
      const m = ch[store.keys.SYNC_PREFIX + 'meta'].newValue;
      if (m && m.ts > (state.ts || 0) + 1000) store.load().then(({ state: s }) => { if (s.ts > state.ts) { state = s; applySettings(); render(); showBg(); } });
    }
  });
}
window.addEventListener('focus', () => { if (state) mergeInbox(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) store.flushSync(); });
window.addEventListener('pagehide', () => store.flushSync());

// ---------- старт ----------
(async function boot() {
  const { state: s, migrated } = await store.load();
  state = s;
  await loadSecrets();
  // ключи удалённых групп (и виджетов, которых больше нет) не храним
  const gone = Object.keys(secrets).filter((id) => !state.groups.some((g) => g.id === id));
  if (gone.length) { gone.forEach((id) => delete secrets[id]); saveSecrets(); }
  applySettings();
  tick();
  setInterval(tick, 5000);
  await showBg();
  render();
  initSearch();
  $('#addBtn').addEventListener('click', (e) => openMenu(e.currentTarget, addItems()));
  $('#settingsBtn').addEventListener('click', openSettings);
  requestAnimationFrame(() => document.body.classList.remove('booting'));
  if (migrated) { await store.save(state); await store.flushSync(state); store.cleanupOld(); toast(R.lang() === 'ru' ? 'Данные из прошлой версии перенесены' : 'Data from the previous version was imported'); }
  mergeInbox();
})();
