"""Baut die Web-App (GitHub Pages) nach dist/ oder mit --app die Store-App nach www/ (Capacitor).

Die App-Variante hat weder Service Worker noch Manifest: die Store-App bringt ihre Dateien selbst mit.
"""
import pathlib, shutil, sys

APP = '--app' in sys.argv
root = pathlib.Path(__file__).resolve().parent.parent
out = root / ('www' if APP else 'dist')
if out.exists():
    shutil.rmtree(out)
out.mkdir()

FILES = ['style.css'] + sorted(p.name for p in root.glob('*.js'))
FILES += [p.name for p in root.glob('*.html') if p.name != 'index.html']   # privacy.html, imprint.html …
DIRS = ['assets', 'icons']

page = (root / 'index.html').read_text(encoding='utf-8')
if APP:
    manifest = '  <link rel="manifest" href="manifest.webmanifest">\n'
    assert manifest in page, 'Manifest-Link fehlt in index.html'
    page = page.replace(manifest, '')
    FILES = [f for f in FILES if f != 'sw.js']
else:
    FILES += ['manifest.webmanifest']
(out / 'index.html').write_text(page, encoding='utf-8')
for f in FILES:
    shutil.copy(root / f, out / f)
for d in DIRS:
    shutil.copytree(root / d, out / d)
if not APP:
    (out / '.nojekyll').write_text('')
print('gebaut:', out.name, sorted(p.name for p in out.iterdir()))
