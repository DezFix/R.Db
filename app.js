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
function linkGroups() { return state.groups.filter((g) => g.kind === 'links'); }
function ensureLinkGroup(preferId) {
  const g = (preferId && findGroup(preferId)) || linkGroups()[0];
  if (g && g.kind === 'links') return g;
  const ng = R.newGroup('links', t('inbox'));
  state.groups.unshift(ng);
  return ng;
}
function kindIcon(kind) {
  return { links: 'link', note: 'note', todo: 'check', weather: 'widget', currency: 'cash', crypto: 'coin', clock: 'clock', calendar: 'cal',
    countdown: 'timer', rss: 'rss', iframe: 'frame', github: 'tag', topsites: 'star' }[kind] || 'group';
}
const kName = (k) => t('k' + k[0].toUpperCase() + k.slice(1));

// кэш для виджетов и иконок — только на этом устройстве, не синхронизируется
const cache = (() => {
  let c = {};
  try { c = JSON.parse(localStorage.getItem('rdb2_cache') || '{}') || {}; } catch {}
  c.icon = c.icon || {}; c.wx = c.wx || {}; c.geo = c.geo || {}; c.fx = c.fx || {}; c.fxHist = c.fxHist || {}; c.cr = c.cr || {};
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
  $('#dim').style.background = `rgba(6,8,12,${b.dim / 100})`;
  document.documentElement.style.setProperty('--bg-blur', b.blur + 'px');
  const credit = $('#credit');
  credit.hidden = true;
  if (b.mode === 'color') return paintBg(b.color || R.BG_PRESETS[0], false);
  if (b.mode === 'upload') { const f = await store.getBgFile(); return paintBg(f ? `url("${f}")` : R.BG_PRESETS[0], !!f); }
  const list = bgUrls();
  if (bgLocal.index == null) bgLocal.index = b.index || 0;
  const iv = +b.interval;
  const due = force || iv === 0 || (iv > 0 && Date.now() - (bgLocal.last || 0) > iv * 60e3);
  if (due && (bgLocal.last || force || iv === 0)) bgLocal.index = (bgLocal.index + 1) % list.length;
  if (due) { bgLocal.last = Date.now(); bgLocalSave(); }
  const url = list[bgLocal.index % list.length];
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
function applySettings() {
  const s = state.settings;
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
  computeCols();
  grid.replaceChildren(...state.groups.map(groupEl));
  grid.querySelectorAll('.card').forEach((c) => { packCard(c); ro.observe(c.firstElementChild); });
  $('#emptyBoard').hidden = state.groups.length > 0;
  loadWidgets();
}

// ---------- группы ----------
function groupEl(g) {
  const span = g.span >= 4 ? cols : Math.min(g.span || 1, cols);
  const card = h('section', { class: `card k-${g.kind}` + (g.collapsed ? ' collapsed' : ''), 'data-gid': g.id, style: { gridColumn: `span ${span}` } });
  const inner = h('div', { class: 'card-in' });
  const head = h('header', { class: 'card-head', draggable: !state.settings.lock },
    h('button', { class: 'card-title', text: g.title || t('k' + g.kind[0].toUpperCase() + g.kind.slice(1)), title: g.collapsed ? t('expand') : t('collapse'),
      onclick: () => { g.collapsed = !g.collapsed; save(); } }),
    h('span', { class: 'card-tools' },
      g.kind === 'links' ? h('button', { class: 'tool', title: t('addLink'), html: svg('plus'), onclick: () => openLinkDialog({ groupId: g.id }) }) : null,
      h('button', { class: 'tool', title: t('edit'), html: svg('dots'), onclick: (e) => openMenu(e.currentTarget, groupMenu(g)) })));
  head.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); openMenuAt(e.clientX, e.clientY, groupMenu(g)); });
  head.addEventListener('dragstart', (e) => { if (state.settings.lock) return e.preventDefault(); drag = { type: 'group', id: g.id }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/x-rdb', g.id); card.classList.add('dragging'); });
  head.addEventListener('dragend', () => { card.classList.remove('dragging'); clearDrop(); drag = null; });
  const body = h('div', { class: 'card-body' });
  if (!g.collapsed) {
    if (g.kind === 'links') linksBody(g, body);
    else if (g.kind === 'note') noteBody(g, body);
    else if (g.kind === 'todo') todoBody(g, body);
    else body.append(h('div', { class: 'w-load', 'data-wid': g.id }, h('span', { class: 'spinner' })));
  }
  inner.append(head, body);
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
  if (i > 0) items.push({ icon: 'up', label: t('moveUp'), run: () => { state.groups.splice(i, 1); state.groups.splice(i - 1, 0, g); save(); } });
  if (i < state.groups.length - 1) items.push({ icon: 'down', label: t('moveDown'), run: () => { state.groups.splice(i, 1); state.groups.splice(i + 1, 0, g); save(); } });
  items.push({ icon: 'trash', label: t('del'), danger: true, run: () => removeGroup(g) });
  return items;
}
function removeGroup(g) {
  const i = state.groups.indexOf(g);
  if (i < 0) return;
  state.groups.splice(i, 1);
  save();
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
  a.append(iconBox(l));
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
      rss: wRss, iframe: wIframe, github: wGithub, topsites: wTopsites }[g.kind];
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
const CUR_SYM = { USD: '$', EUR: '€', UAH: '₴', GBP: '£', PLN: 'zł', JPY: '¥', CNY: '¥', CHF: '₣', CZK: 'Kč', RUB: '₽', KZT: '₸', TRY: '₺', GEL: '₾' };
const CURRENCIES = ['USD', 'EUR', 'UAH', 'RUB', 'GBP', 'PLN', 'CHF', 'JPY', 'CNY', 'CZK', 'SEK', 'NOK', 'CAD', 'AUD', 'KZT', 'TRY', 'GEL', 'BYN', 'ILS', 'INR'];
async function wCurrency(g, el) {
  const base = g.base || 'USD';
  let rec = cache.c.fx[base];
  if (!fresh(rec, 180)) {
    const r = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    const j = await r.json();
    if (j.result !== 'success') throw new Error('fx');
    rec = { t: Date.now(), rates: j.rates };
    cache.c.fx[base] = rec;
  }
  // вчерашние значения — для стрелки изменения
  const today = new Date().toISOString().slice(0, 10);
  const hist = cache.c.fxHist[base] || (cache.c.fxHist[base] = {});
  const rows = (g.symbols || []).filter((s) => s !== base && rec.rates[s]).map((s) => {
    const v = 1 / rec.rates[s];
    const hs = hist[s] || (hist[s] = {});
    if (!hs[today]) { hs[today] = v; Object.keys(hs).sort().slice(0, -3).forEach((k) => delete hs[k]); }
    const prevDay = Object.keys(hs).sort().filter((k) => k < today).pop();
    const diff = prevDay ? v - hs[prevDay] : 0;
    return h('div', { class: 'kv' }, h('span', { class: 'kv-k', text: s }),
      h('span', { class: 'kv-v', text: v.toLocaleString(undefined, { maximumFractionDigits: v < 1 ? 4 : 2, minimumFractionDigits: 2 }) + ' ' + (CUR_SYM[base] || base) }),
      h('span', { class: 'kv-d ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : ''), text: diff ? (diff > 0 ? '▲' : '▼') : '' }));
  });
  cache.save();
  el.replaceChildren(...(rows.length ? rows : [h('div', { class: 'w-msg', text: '—' })]));
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
function originOf(url) { const u = R.parseUrl(url); return u ? u.origin + '/*' : null; }
async function hasOrigin(url) {
  const o = originOf(url);
  try { return !!(o && ext && ext.permissions && await ext.permissions.contains({ origins: [o] })); } catch { return false; }
}
function askOrigin(url) { const o = originOf(url); return o && ext && ext.permissions ? ext.permissions.request({ origins: [o] }).catch(() => false) : Promise.resolve(false); }
function grantBtn(url, g, el, fn) {
  return h('div', { class: 'grant' }, h('span', { class: 'w-msg', text: t('needAccess', (R.parseUrl(url) || {}).hostname || url) }),
    h('button', { class: 'btn ghost sm', text: t('grant'), onclick: async () => { if (await askOrigin(url)) fn(g, el); } }));
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
async function wIframe(g, el) {
  if (!g.url) { el.replaceChildren(h('button', { class: 'w-msg link', text: t('pageUrl'), onclick: () => openGroupDialog({ group: g }) })); return; }
  const fr = h('iframe', { class: 'frame', src: g.url, loading: 'lazy', referrerPolicy: 'no-referrer', style: { height: clamp(+g.height || 320, 120, 1200) + 'px' } });
  el.replaceChildren(fr, h('a', { class: 'frame-open', href: g.url, target: '_blank', rel: 'noopener', html: svg('ext') }));
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

// ---------- перетаскивание ----------
let drag = null;
let dropMark = null;
function clearDrop() {
  document.querySelectorAll('.drop-before,.drop-after,.drop-into,.drop-left,.drop-right').forEach((x) => x.classList.remove('drop-before', 'drop-after', 'drop-into', 'drop-left', 'drop-right'));
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
  if (drag && drag.type === 'group') {
    if (drag.id === g.id) return;
    e.preventDefault();
    const r = card.getBoundingClientRect();
    const before = cols > 1 ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
    clearDrop();
    card.classList.add(before ? 'drop-left' : 'drop-right');
    dropMark = { type: 'group', before };
    return;
  }
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
  if (mark.type === 'group' && drag) {
    const from = state.groups.findIndex((x) => x.id === drag.id);
    const moving = state.groups.splice(from, 1)[0];
    let to = state.groups.indexOf(g);
    if (!mark.before) to++;
    state.groups.splice(to, 0, moving);
    save();
    return;
  }
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

  const body = h('div', { class: 'stack' }, preview, field(t('url'), url), h('div', { class: 'row2' }, field(t('title'), title), field(t('group'), gsel)),
    field(t('desc'), desc), status, h('div', { class: 'field' }, h('span', { class: 'field-l', text: t('icon') }), iconTabs));
  openDialog(editing ? t('editLink') : t('newLink'), body, {
    extraBtn: editing ? h('button', { type: 'button', class: 'btn ghost danger', html: svg('trash'), title: t('del'), onclick: () => { dlg.close(); removeLink(link.id); } }) : null,
    onSave: () => {
      const u = R.normalizeUrl(url.value);
      if (!u) { url.focus(); return false; }
      const vals = { url: u, title: title.value.trim() || R.titleFromUrl(u), desc: desc.value.trim(), icon: data.icon };
      let target = gsel.value === '__new' ? ensureLinkGroup() : findGroup(gsel.value);
      if (editing) {
        const f = findLink(link.id);
        if (!f) return;
        if (vals.url !== f.l.url || vals.title !== f.l.title || vals.icon !== f.l.icon) delete cache.c.icon[iconKey(f.l)];
        Object.assign(f.l, vals);
        if (!vals.desc) delete f.l.desc;
        if (!vals.icon) delete f.l.icon;
        if (target && target !== f.g) { f.g.items.splice(f.i, 1); target.items.push(f.l); }
      } else {
        const l = { id: uid(), ...vals };
        if (!l.desc) delete l.desc;
        if (!l.icon) delete l.icon;
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
  let view = null, city, days, hours, base, syms, coins, zones, events, feed, count, purl, height, repos;
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
    parts.push(field(t('base'), base), field(t('symbols'), syms));
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
      if (base) { tgt.base = base.value; tgt.symbols = Array.from(syms.querySelectorAll('.chip.on')).map((x) => x.textContent); }
      if (coins) tgt.coins = coins.value.split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
      if (feed) {
        const u = R.normalizeUrl(feed.value);
        if (!u) { feed.focus(); return false; }
        askOrigin(u).then(() => render()); // спрашиваем доступ, пока есть жест пользователя
        if (u !== tgt.feed && cache.c.rss) delete cache.c.rss[u];
        tgt.feed = u;
      }
      if (purl) { const u = R.normalizeUrl(purl.value); if (!u) { purl.focus(); return false; } tgt.url = u; tgt.height = +height.value; }
      if (count) tgt.count = +count.value;
      if (zones) tgt.zones = zones.value.split(',').map((z) => z.trim()).filter((z) => parseZone(z));
      if (events) tgt.events = events.value.split('\n').map((l) => /^\s*(\d{4}-\d{2}-\d{2})\s+(.+)$/.exec(l)).filter(Boolean).map((m) => ({ date: m[1], title: m[2].trim() }));
      if (repos) tgt.repos = repos.value.split(/[\s,;]+/).map((r) => r.trim()).filter(Boolean);
      if (g.kind === 'topsites' && ext && ext.permissions) ext.permissions.request({ permissions: ['topSites'] }).then((ok) => ok && render()).catch(() => {});
      if (!editing) state.groups.push(tgt);
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
      ta.addEventListener('change', () => { b.urls = ta.value.split('\n').map((x) => x.trim()).filter(Boolean); bgLocal.index = 0; save(false); showBg(); });
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
    chk('newTab', t('sNewTab')), chk('lock', t('sLock')), chk('sync', t('sSync')));
  // данные
  const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  file.addEventListener('change', () => importFile(file.files[0]));
  const data = h('section', { class: 'set' }, h('h3', { text: t('sData') }),
    h('div', { class: 'btns' },
      h('button', { type: 'button', class: 'btn ghost', text: t('exportJson'), onclick: exportJson }),
      h('button', { type: 'button', class: 'btn ghost', text: t('importJson'), onclick: () => file.click() }),
      h('button', { type: 'button', class: 'btn ghost', text: t('importBm'), onclick: importBookmarks }),
      h('button', { type: 'button', class: 'btn ghost danger', text: t('reset'), onclick: () => { if (confirm(t('confirmReset'))) { state = R.defaultState(); save(); applySettings(); showBg(); openSettings(); } } }),
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
  $('#dim').style.background = `rgba(6,8,12,${b.dim / 100})`;
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
