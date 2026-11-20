// Фон: пункты контекстного меню «Добавить на стол».
// Chrome запускает этот файл как service worker, Firefox — как фоновый скрипт после core.js.
'use strict';
if (typeof importScripts === 'function' && !self.RDB) importScripts('core.js');
const { ext, t, store, cleanTitle, pingTarget, pingUrl } = self.RDB;

function setupMenus() {
  Promise.resolve(ext.contextMenus.removeAll()).catch(() => {}).then(() => {
    ext.contextMenus.create({ id: 'rdb-page', title: t('ctxAddPage'), contexts: ['page'] });
    ext.contextMenus.create({ id: 'rdb-link', title: t('ctxAddLink'), contexts: ['link'] });
  });
}
ext.runtime.onInstalled.addListener(setupMenus);
if (ext.runtime.onStartup) ext.runtime.onStartup.addListener(setupMenus);

ext.contextMenus.onClicked.addListener(async (info, tab) => {
  let url, title, fav = '';
  if (info.menuItemId === 'rdb-link' && info.linkUrl) {
    url = info.linkUrl;
    title = info.linkText || info.selectionText || ''; // linkText есть только в Firefox
  } else if (info.menuItemId === 'rdb-page' && tab && tab.url) {
    url = tab.url;
    title = tab.title || '';
    if (tab.favIconUrl && /^https?:/.test(tab.favIconUrl)) fav = tab.favIconUrl;
  }
  if (!url || !/^(https?|ftp):/.test(url)) return;
  title = cleanTitle(title, url);
  await store.pushInbox({ url, title: title || '', fav });
  try {
    await ext.action.setBadgeBackgroundColor({ color: '#7c8cff' });
    await ext.action.setBadgeText({ text: '✓' });
    setTimeout(() => paintBadge(), 1800);
  } catch {}
});

// Firefox: снимаем запрет на встраивание (X-Frame-Options, CSP frame-ancestors) для фреймов внутри нашей страницы.
// Срабатывает только для сайтов, к которым пользователь сам дал доступ кнопкой «Разрешить встраивание».
// В Chrome то же делает declarativeNetRequest (app.js), там блокирующий webRequest недоступен.
if (ext.webRequest && ext.webRequest.onHeadersReceived && self.RDB.isFirefox) {
  const mine = ext.runtime.getURL('');
  try {
    ext.webRequest.onHeadersReceived.addListener((d) => {
      const from = d.documentUrl || d.originUrl || '';
      if (!from.startsWith(mine) || !d.responseHeaders) return {};
      const out = [];
      for (const hd of d.responseHeaders) {
        const n = hd.name.toLowerCase();
        if (n === 'x-frame-options') continue;
        if (n === 'content-security-policy' && hd.value) {
          const v = hd.value.split(';').filter((p) => !/^\s*frame-ancestors\b/i.test(p)).join(';');
          if (v.trim()) out.push({ name: hd.name, value: v });
          continue;
        }
        out.push(hd);
      }
      return { responseHeaders: out };
    }, { urls: ['<all_urls>'], types: ['sub_frame'] }, ['blocking', 'responseHeaders']);
    // запросы виджетов к сайтам с доступом — без Origin нашей страницы: многие панели режут чужой Origin как CSRF
    ext.webRequest.onBeforeSendHeaders.addListener((d) => {
      const from = d.documentUrl || d.originUrl || '';
      if (!from.startsWith(mine) || !d.requestHeaders) return {};
      return { requestHeaders: d.requestHeaders.filter((x) => x.name.toLowerCase() !== 'origin') };
    }, { urls: ['<all_urls>'], types: ['xmlhttprequest'] }, ['blocking', 'requestHeaders']);
  } catch (e) { console.warn('webRequest', e); }
}

// ---------- фоновая проверка серверов: число на значке и уведомления ----------
const ALARM = 'rdb-ping', DOWN = 'rdb2_down';
async function getLocal(k) { try { return ((await ext.storage.local.get(k)) || {})[k]; } catch { return undefined; } }
async function paintBadge() {
  const down = (await getLocal(DOWN)) || {};
  const n = Object.keys(down).length;
  try {
    await ext.action.setBadgeBackgroundColor({ color: '#e5484d' });
    if (ext.action.setBadgeTextColor) await ext.action.setBadgeTextColor({ color: '#ffffff' });
    await ext.action.setBadgeText({ text: n ? String(n) : '' });
    await ext.action.setTitle({ title: n ? t('alDownMany', Object.values(down).join(', ')) : 'R.Db' });
  } catch {}
}
async function setupAlarm() {
  const { state } = await store.load();
  const on = state.settings.alerts && state.settings.alerts !== 'off' && state.settings.ping !== 'off';
  if (on) {
    const cur = await Promise.resolve(ext.alarms.get(ALARM)).catch(() => null);
    if (!cur) ext.alarms.create(ALARM, { periodInMinutes: 1, delayInMinutes: 0.1 });
  } else {
    await Promise.resolve(ext.alarms.clear(ALARM)).catch(() => {});
    await ext.storage.local.remove(DOWN).catch(() => {});
    paintBadge();
  }
}
async function checkServers() {
  const { state } = await store.load();
  const s = state.settings;
  if (!s.alerts || s.alerts === 'off') return setupAlarm();
  const targets = new Map(); // url -> название
  state.groups.forEach((g) => g.kind === 'links' && g.items.forEach((l) => { const u = pingTarget(l, s); if (u && !targets.has(u)) targets.set(u, l.title); }));
  const urls = [...targets.keys()];
  const res = {};
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(6, urls.length) }, async () => {
    while (i < urls.length) { const u = urls[i++]; res[u] = await pingUrl(u); }
  }));
  const before = (await getLocal(DOWN)) || {};
  const now = {};
  urls.forEach((u) => { if (res[u].s === 'down') now[u] = targets.get(u); });
  await ext.storage.local.set({ [DOWN]: now, rdb2_ping_bg: res });
  paintBadge();
  if (s.alerts === 'notify' && ext.notifications) {
    const fell = Object.keys(now).filter((u) => !before[u]).map((u) => now[u]);
    const rose = Object.keys(before).filter((u) => !now[u] && targets.has(u)).map((u) => before[u]);
    const icon = ext.runtime.getURL('icons/icon128.png');
    if (fell.length) ext.notifications.create('rdb-down', { type: 'basic', iconUrl: icon, title: 'R.Db', message: t(fell.length > 1 ? 'alDownMany' : 'alDown', fell.join(', ')) });
    if (rose.length) ext.notifications.create('rdb-up', { type: 'basic', iconUrl: icon, title: 'R.Db', message: t('alUp', rose.join(', ')) });
  }
}
if (ext.alarms) {
  ext.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) checkServers(); });
  ext.runtime.onInstalled.addListener(setupAlarm);
  if (ext.runtime.onStartup) ext.runtime.onStartup.addListener(() => { setupAlarm(); paintBadge(); });
  ext.storage.onChanged.addListener((ch, area) => {
    if (area === 'local' && ch[store.keys.KEY]) {
      const o = ch[store.keys.KEY].oldValue, n = ch[store.keys.KEY].newValue;
      if (!o || !n || o.settings.alerts !== n.settings.alerts || o.settings.ping !== n.settings.ping) setupAlarm();
    }
  });
}
if (ext.notifications && ext.notifications.onClicked) {
  ext.notifications.onClicked.addListener(() => { ext.tabs.create({ url: ext.runtime.getURL('index.html') }); });
}
