"""Builds release packages into release/:

  release/firefox/          unpacked add-on for Firefox (about:debugging -> Load Temporary Add-on -> manifest.json)
  release/chrome/           unpacked extension for Chrome/Edge/Brave (Load unpacked)
  release/rdb-<ver>-firefox.zip / .xpi   for addons.mozilla.org
  release/rdb-<ver>-chrome.zip           for the Chrome Web Store

Each browser gets its own manifest: Firefox runs bg.js as a background script,
Chrome as a service worker. Run from the project root:  python tools/build-release.py
"""
import json, os, shutil, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'release')
FILES = ['index.html', 'app.js', 'core.js', 'icons-index.js', 'style.css', 'popup.html', 'popup.js', 'popup.css', 'bg.js', 'LICENSE']
DIRS = ['icons']

base = json.load(open(os.path.join(ROOT, 'manifest.json'), encoding='utf-8'))
ver = base['version']
shutil.rmtree(OUT, ignore_errors=True)

for target in ('firefox', 'chrome'):
    m = json.loads(json.dumps(base))
    if target == 'firefox':
        m['background'] = {'scripts': ['core.js', 'bg.js']}
    else:
        m['background'] = {'service_worker': 'bg.js'}
        m.pop('browser_specific_settings', None)
    d = os.path.join(OUT, target)
    os.makedirs(d)
    for f in FILES:
        if os.path.exists(os.path.join(ROOT, f)):
            shutil.copy2(os.path.join(ROOT, f), d)
    for sub in DIRS:
        shutil.copytree(os.path.join(ROOT, sub), os.path.join(d, sub))
    with open(os.path.join(d, 'manifest.json'), 'w', encoding='utf-8') as fh:
        json.dump(m, fh, ensure_ascii=False, indent=2)
    zpath = os.path.join(OUT, f'rdb-{ver}-{target}.zip')
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
        for dirpath, _, names in os.walk(d):
            for n in sorted(names):
                full = os.path.join(dirpath, n)
                z.write(full, os.path.relpath(full, d).replace(os.sep, '/'))
    if target == 'firefox':
        shutil.copy2(zpath, zpath[:-4] + '.xpi')
    print('built', target, ver)
