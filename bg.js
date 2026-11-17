// Фон: пункты контекстного меню «Добавить на стол».
// Chrome запускает этот файл как service worker, Firefox — как фоновый скрипт после core.js.
'use strict';
if (typeof importScripts === 'function' && !self.RDB) importScripts('core.js');
const { ext, t, store, cleanTitle } = self.RDB;

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
    setTimeout(() => ext.action.setBadgeText({ text: '' }), 1800);
  } catch {}
});
