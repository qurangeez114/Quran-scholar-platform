#!/usr/bin/env python3
"""Cache-busting for long-lived JS/CSS (perf).

Rewrites local <script src> / <link href> references in the listed pages to
/v/<content-hash>/<path>. netlify.toml rewrites /v/<hash>/* back to the real
file and serves /v/* with a one-year immutable Cache-Control, while the plain
paths (used by dynamic imports, Netlify snippets, other pages) keep max-age=0.

Run after editing any versioned asset:   python3 scripts/version-assets.py
Check mode (fails if a hash is stale):   python3 scripts/version-assets.py --check
"""
import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = ['index.html', 'themes.html', 'theme-reader.html', 'quran-crossref.html',
         'compare.html', 'research.html', 'narrations.html',
         'theme-tensions.html', 'my-pages.html', 'verse-deck.html']
REF = re.compile(r'((?:src|href)=")(?:/v/[0-9a-f]{10}/|/)?([A-Za-z0-9_\-./]+\.(?:js|css))(")')

def digest(path):
    with open(os.path.join(ROOT, path), 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()[:10]

def rewrite(html):
    def sub(m):
        path = m.group(2)
        if path.startswith(('http', '//')) or not os.path.isfile(os.path.join(ROOT, path)):
            return m.group(0)
        return f'{m.group(1)}/v/{digest(path)}/{path}{m.group(3)}'
    return REF.sub(sub, html)

def main():
    check = '--check' in sys.argv
    stale = []
    for page in PAGES:
        p = os.path.join(ROOT, page)
        old = open(p, encoding='utf-8').read()
        new = rewrite(old)
        if new != old:
            if check: stale.append(page)
            else: open(p, 'w', encoding='utf-8').write(new)
    if check and stale:
        print('Stale asset hashes in: ' + ', '.join(stale) + ' (run scripts/version-assets.py)')
        sys.exit(1)

if __name__ == '__main__':
    main()
