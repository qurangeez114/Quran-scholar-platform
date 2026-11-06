"""Structural safeguards for universal QuranHikma gold theme and phone layout."""
from pathlib import Path

chrome = Path("site-chrome.js").read_text(encoding="utf-8")
motion = Path("site-motion.js").read_text(encoding="utf-8")
css = Path("quranhikma-universal-gold.css").read_text(encoding="utf-8")
home = Path("index.html").read_text(encoding="utf-8")
for page in ("index.html", "themes.html", "research.html", "stories.html",
             "theme-analysis.html", "contradiction.html", "account.html"):
    text = Path(page).read_text(encoding="utf-8")
    assert "site-chrome.js" in text, f"{page} missing site-wide chrome"
assert "qh-universal-gold-css" in chrome
assert "quranhikma-universal-gold.css" in chrome
assert chrome.index("qh-cinematic-css") < chrome.index("qh-universal-gold-css")
assert "hero.insertAdjacentElement('afterend', figure)" in motion
assert "hero.insertBefore(figure, form)" not in motion
assert "qh-home-lab-media-compact" in motion
assert "object-fit:contain!important" in css
assert "qh-home-lab-media-compact" in css
assert "body.qh-cinema #qh-school-topnav" in css
assert "min-height:44px" in css
assert "overflow-y:auto!important" in css
assert "@media(max-width:740px)" in css
assert "prefers-reduced-motion:reduce" in css
assert "qh-home-research-form" in home
assert "qh-home-grid" in home
assert "qh-home-single-form" in home
assert "Holy Qur’an" not in home[home.index('class="qh-home-hero"'):home.index('class="qh-home-shortcuts"')]
print("Shared gold-theme structure and phone-safety smoke checks passed.")
