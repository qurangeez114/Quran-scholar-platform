"""
Ibn Kathir Arabic Tafsir — Full Seeder
Run this in Pydroid on your phone.

Source: github.com/spa5k/tafsir_api
Table:  tafsir_entries (sura, aya, scholar_key, scholar_name, tradition, language, content, source_name, source_url)
"""

import urllib.request
import urllib.parse
import json
import time

# ── Config ──────────────────────────────────────────────
SUPABASE_URL = "https://ylosytbxpzxzwfzjpaej.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

BASE_URL = "https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/ar-tafsir-ibn-kathir"

# Verse counts per sura
VERSE_COUNTS = [
    7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
    112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,
    54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,
    14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,22,31,13,
    54,55,43,34,31,45,44,26,22,25,28,36,21,8,16,15,5,12,11,13,
    12,10,19,14,11,4,16,14,17,2,22,11,4,5,2,23,7,3,19,5,
    8,3,9,1,7,5
]

def fetch_tafsir(sura, aya):
    url = f"{BASE_URL}/{sura}/{aya}.json"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
            return data.get("text", "").strip()
    except:
        return None

def upsert_batch(rows):
    payload = json.dumps(rows, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        SUPABASE_URL + "/rest/v1/tafsir_entries",
        data=payload,
        method="POST",
        headers=HEADERS
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return True
    except urllib.error.HTTPError as e:
        print(f"  ⚠ DB error {e.code}: {e.read()[:100]}")
        return False

def check_existing():
    req = urllib.request.Request(
        SUPABASE_URL + "/rest/v1/tafsir_entries?scholar_key=eq.ibn_kathir&language=eq.ar&select=sura,aya&order=sura,aya&limit=1",
        headers={"apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            rows = json.loads(r.read())
            return len(rows) > 0
    except:
        return False

def get_last_saved():
    """Find where we left off in case of interruption"""
    req = urllib.request.Request(
        SUPABASE_URL + "/rest/v1/tafsir_entries?scholar_key=eq.ibn_kathir&language=eq.ar&select=sura,aya&order=sura.desc,aya.desc&limit=1",
        headers={"apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            rows = json.loads(r.read())
            if rows:
                return rows[0]["sura"], rows[0]["aya"]
    except:
        pass
    return 1, 0

print("=" * 50)
print("Ibn Kathir Arabic Tafsir Seeder")
print("=" * 50)

# Check if we have existing data and resume
last_sura, last_aya = get_last_saved()
total_existing = last_sura * 10  # rough estimate
if last_sura > 1 or last_aya > 0:
    print(f"▶ Resuming from Sura {last_sura}, Aya {last_aya}")
else:
    print("▶ Starting fresh")

total_inserted = 0
total_errors = 0
BATCH_SIZE = 20

for sura in range(1, 115):
    num_ayas = VERSE_COUNTS[sura - 1]
    
    # Skip already-processed suras
    if sura < last_sura:
        continue
    
    print(f"\nSura {sura}/114 ({num_ayas} ayas)...", end=" ", flush=True)
    
    batch = []
    sura_count = 0
    
    for aya in range(1, num_ayas + 1):
        # Skip already-processed ayas in resume sura
        if sura == last_sura and aya <= last_aya:
            continue
        
        text = fetch_tafsir(sura, aya)
        
        if text:
            batch.append({
                "sura": sura,
                "aya": aya,
                "scholar_key": "ibn_kathir",
                "scholar_name": "ابن كثير",
                "tradition": "sunni",
                "language": "ar",
                "content": text,
                "source_name": "تفسير القرآن العظيم — ابن كثير",
                "source_url": f"https://github.com/spa5k/tafsir_api/blob/main/tafsir/ar-tafsir-ibn-kathir/{sura}/{aya}.json"
            })
            sura_count += 1
        else:
            total_errors += 1
        
        # Upload in batches
        if len(batch) >= BATCH_SIZE:
            if upsert_batch(batch):
                total_inserted += len(batch)
            batch = []
            time.sleep(0.3)  # be gentle on the APIs
    
    # Upload remaining
    if batch:
        if upsert_batch(batch):
            total_inserted += len(batch)
        batch = []
    
    print(f"✅ {sura_count} ayas saved")
    time.sleep(0.5)

print("\n" + "=" * 50)
print(f"✅ DONE! Inserted: {total_inserted} | Errors: {total_errors}")
print("=" * 50)
