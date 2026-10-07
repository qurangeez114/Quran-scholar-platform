"""Generate SILMA plain-reading MP3s for verses where a riwayah differs from Hafs.
Env: RIWAYAH (warsh|qalun|duri|...), OFFSET, LIMIT. Output: audio/riwayat/<riwayah>/SSS_AAA.mp3
"""
import json, os, re, subprocess, site, urllib.request, urllib.parse
from pathlib import Path

RW = os.environ["RIWAYAH"]; OFFSET = int(os.environ.get("OFFSET", "0")); LIMIT = int(os.environ.get("LIMIT", "100"))
html = Path("index.html").read_text(encoding="utf-8")
URL = re.search(r"SUPABASE_URL\s*=\s*'([^']+)'", html).group(1)
KEY = re.search(r"SUPABASE_KEY\s*=\s*'([^']+)'", html).group(1)

def get(path):
    req = urllib.request.Request(URL + "/rest/v1/" + path, headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

targets = get(f"riwayat_audio_targets?riwayah=eq.{RW}&select=sura_id,aya_number&order=sura_id,aya_number&offset={OFFSET}&limit={LIMIT}")
print("targets in this chunk:", len(targets))
TANWIN = {"ࣰ": "ً", "ࣱ": "ٌ", "ࣲ": "ٍ"}
def clean(t):
    for a, b in TANWIN.items(): t = t.replace(a, b)
    t = re.sub(r"[ۖ-ۜ۟-۪ۤۧۨ-ۭ࣓-ࣿ‌-‏]", "", t)
    return re.sub(r"\s+", " ", t).strip()

from silma_tts.api import SilmaTTS
tts = SilmaTTS()
ref_file = getattr(tts, "default_ref_audio", None)
if not ref_file:
    c = [p for r in site.getsitepackages() for p in Path(r).rglob("ar.ref.24k.wav")]
    if not c: raise FileNotFoundError("ar.ref.24k.wav not found")
    ref_file = str(c[0])
ref_text = "ويدقق النظر في القرآن الكريم وسائر الكتب السماوية ويتبع مسالك الرسل العظام عليهم الصلاة والسلام."

out = Path("audio/riwayat") / RW; out.mkdir(parents=True, exist_ok=True)
cache = {}; done = 0
for t in targets:
    s, a = t["sura_id"], t["aya_number"]
    mp3 = out / f"{s:03d}_{a:03d}.mp3"
    if mp3.exists() and mp3.stat().st_size > 1000: continue
    if s not in cache:
        rows = get(f"ayas?sura_id=eq.{s}&select=aya_number,arabic_{RW}&limit=300")
        cache[s] = {r["aya_number"]: r[f"arabic_{RW}"] for r in rows}
    text = clean(cache[s].get(a) or "")
    if not text: raise RuntimeError(f"no {RW} text for {s}:{a}")
    wav = out / f"{s:03d}_{a:03d}.wav"
    tts.infer(ref_file=str(ref_file), ref_text=ref_text, gen_text=text, file_wave=str(wav), seed=42, speed=1)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-ar", "24000", "-ac", "1", "-codec:a", "libmp3lame", "-q:a", "2", str(mp3)], check=True)
    wav.unlink(); done += 1
print("generated", done)
