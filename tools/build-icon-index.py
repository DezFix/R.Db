"""Rebuilds icons-index.js — the offline list of service icons used for auto-matching and icon search.

Sources: homarr-labs/dashboard-icons (Apache-2.0) and selfhst/icons (CC BY 4.0).
Needs git. Run from the project root:  python tools/build-icon-index.py
"""
import os, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def names(repo):
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(['git', 'clone', '--depth', '1', '--filter=blob:none', '--sparse', '-q', f'https://github.com/{repo}.git', d], check=True)
        out = subprocess.run(['git', '-C', d, 'ls-tree', '--name-only', 'HEAD', 'svg/'], check=True, capture_output=True, text=True).stdout
    return {line[4:-4] for line in out.split() if line.endswith('.svg')}

def base(s):
    for suf in ('-light', '-dark'):
        if s.endswith(suf):
            return s[:-len(suf)]
    return s

di, sh = names('homarr-labs/dashboard-icons'), names('selfhst/icons')
di_b = sorted({b for b in map(base, di) if b in di})
sh_b = sorted({b for b in map(base, sh) if b in sh and b not in di})
pack = lambda lst, src: ','.join(n + ('*' if n + '-light' in src else '') for n in lst)
with open(os.path.join(ROOT, 'icons-index.js'), 'w', encoding='utf-8') as f:
    f.write("// Индекс иконок: homarr-labs/dashboard-icons (Apache-2.0) и selfhst/icons (CC BY 4.0).\n"
            "// '*' = есть светлый вариант (-light) для тёмной темы. Генерируется tools/build-icon-index.py\n"
            f"self.ICON_DI = '{pack(di_b, di)}';\nself.ICON_SH = '{pack(sh_b, sh)}';\n")
print(f'dashboard-icons: {len(di_b)}, selfhst: {len(sh_b)}')
