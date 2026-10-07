"""SILMA plain-reading MP3s for one surah (Hafs text exactly as stored in ayas.arabic).
Env: SURA, OFFSET, LIMIT. Output: audio/simple-recitation/SSS_AAA.mp3"""
import json, os, re, subprocess, site, urllib.request
from pathlib import Path

SURA = int(os.environ["SURA"]); OFFSET = int(os.environ.get("OFFSET", "0")); LIMIT = int(os.environ.get("LIMIT", "30"))
html = Path("index.html").read_text(encoding="utf-8")
URL = re.search(r"SUPABASE_URL\s*=\s*'([^']+)'", html).group(1)
KEY = re.search(r"SUPABASE_KEY\s*=\s*'([^']+)'", html).group(1)
req = urllib.request.Request(f"{URL}/rest/v1/ayas?sura_id=eq.{SURA}&select=aya_number,arabic&order=aya_number&offset={OFFSET}&limit={LIMIT}",
                             headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
rows = json.load(urllib.request.urlopen(req, timeout=60))
print("verses in this chunk:", len(rows))

from silma_tts.api import SilmaTTS
tts = SilmaTTS()
ref_file = getattr(tts, "default_ref_audio", None)
if not ref_file:
    c = [p for r in site.getsitepackages() for p in Path(r).rglob("ar.ref.24k.wav")]
    if not c: raise FileNotFoundError("ar.ref.24k.wav not found")
    ref_file = str(c[0])
ref_text = "ويدقق النظر في القرآن الكريم وسائر الكتب السماوية ويتبع مسالك الرسل العظام عليهم الصلاة والسلام."

out = Path("audio/simple-recitation"); out.mkdir(parents=True, exist_ok=True)
for r in rows:
    a = r["aya_number"]; text = (r["arabic"] or "").strip()
    if not text: raise RuntimeError(f"no text for {SURA}:{a}")
    mp3 = out / f"{SURA:03d}_{a:03d}.mp3"
    if mp3.exists() and mp3.stat().st_size > 1000: continue
    wav = out / f"{SURA:03d}_{a:03d}.wav"
    tts.infer(ref_file=str(ref_file), ref_text=ref_text, gen_text=text, file_wave=str(wav), seed=42, speed=1)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-ar", "24000", "-ac", "1", "-codec:a", "libmp3lame", "-q:a", "2", str(mp3)], check=True)
    wav.unlink()
