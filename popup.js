// Попап: добавить текущую вкладку на стол в один клик
'use strict';
const R = window.RDB;
const { t, ext, store } = R;
const $ = (s) => document.querySelector(s);

(async function () {
  const { state } = await store.load();
  document.documentElement.style.setProperty('--accent', state.settings.accent);
  $('#add').textContent = t('add');
  $('#open').textContent = t('popOpen');
  $('#open').addEventListener('click', () => { ext.tabs.create({ url: ext.runtime.getURL('index.html') }); window.close(); });

  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  const url = tab && tab.url;
  if (!url || !/^(https?|ftp):/.test(url)) {
    $('#ic').hidden = true; $('#url').textContent = url || '';
    $('#title').value = t('popNoTab'); $('#title').disabled = true; $('#add').disabled = true; $('#group').hidden = true;
    return;
  }
  const title = R.cleanTitle(tab.title, url) || R.titleFromUrl(url);
  $('#title').value = title;
  $('#url').textContent = url.replace(/^https?:\/\/(www\.)?/, '');

  // иконка-превью: та же логика, что на столе
  const link = { url, title, fav: tab.favIconUrl };
  const ic = $('#ic');
  ic.style.setProperty('--h', R.hueOf(title));
  $('#letter').textContent = R.letterOf(title);
  const urls = R.iconCandidates(link);
  if (urls.length) {
    const img = new Image();
    let i = 0;
    img.onerror = () => { i++; if (i < urls.length) img.src = urls[i]; else img.remove(); };
    img.onload = () => { if (img.naturalWidth < 24 && /google|duckduckgo/.test(img.src)) return img.onerror(); ic.style.background = 'transparent'; $('#letter').hidden = true; };
    img.src = urls[0];
    ic.append(img);
  }

  const groups = state.groups.filter((g) => g.kind === 'links');
  const sel = $('#group');
  if (!groups.length) sel.append(new Option(t('inbox'), ''));
  groups.forEach((g) => sel.append(new Option(g.title || t('untitled'), g.id)));
  const last = localStorage.getItem('rdb2_lastGroup');
  if (last && groups.some((g) => g.id === last)) sel.value = last;

  $('#f').addEventListener('submit', async (e) => {
    e.preventDefault();
    localStorage.setItem('rdb2_lastGroup', sel.value);
    await store.pushInbox({ url, title: $('#title').value.trim() || title, groupId: sel.value || null,
      fav: tab.favIconUrl && /^https?:/.test(tab.favIconUrl) ? tab.favIconUrl : '' });
    $('#add').disabled = true;
    $('#add').textContent = t('popAdded');
    setTimeout(() => window.close(), 700);
  });
  $('#title').select();
})();
