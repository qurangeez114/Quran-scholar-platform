from pathlib import Path
import re

home = Path("index.html").read_text(encoding="utf-8")
styles = Path("quranhikma-emerald-gold.css").read_text(encoding="utf-8")
required_ids = [
    "qh-home-directory", "qh-home-research-form", "qh-home-search",
    "qh-home-grid", "qh-home-sura-filter", "qh-quick-jump",
    "qh-home-single-form", "qh-home-chrono", "qh-quick-prev", "qh-quick-next",
]
for element_id in required_ids:
    count = len(re.findall(r'id=["\\\']' + re.escape(element_id) + r'["\\\']', home))
    assert count == 1, f"{element_id}: expected one element; found {count}"
assert 'quranhikma-emerald-gold.css' in home
assert 'Islam Research Platform' in home
assert 'Holy Qur' not in home[home.index('class="qh-home-hero"'):home.index('class="qh-home-shortcuts"')]
assert 'href="#qh-home-grid"' in home
assert 'action="research.html"' in home and 'name="q"' in home
assert 'body.qh-home-mode' in styles
assert "linear-gradient" in styles and "prefers-reduced-motion" in styles
assert "qh-home-research-go" in styles
print("QuranHikma homepage structural smoke tests passed.")
