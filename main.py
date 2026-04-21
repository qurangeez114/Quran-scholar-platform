import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from supabase import create_client

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = "https://ylosytbxpzxzwfzjpaej.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE0NjUyNywiZXhwIjoyMDkxNzIyNTI3fQ.sI8IBGrXDoIFpAQ4louaUubokkWyfZKRzV13KxqPbOc"

client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.get("/app")
def serve_app():
    return FileResponse("/storage/emulated/0/quran_project/Download/quran.html")

@app.get("/")
def home():
    return {"status": "Quran API is running", "languages": ["tigrinya", "arabic", "arabic_transliteration", "english", "amharic"]}

@app.get("/suras")
def get_suras():
    res = client.table("suras").select("*").order("sura_id").execute()
    return {"count": len(res.data), "suras": res.data}

@app.get("/suras/{sura_id}")
def get_sura(sura_id: int):
    res = client.table("ayas").select("*").eq("sura_id", sura_id).order("aya_number").execute()
    return {"sura_id": sura_id, "ayas": res.data}

@app.get("/suras/{sura_id}/ayas/{aya_number}")
def get_aya(sura_id: int, aya_number: int):
    res = client.table("ayas").select("*").eq("sura_id", sura_id).eq("aya_number", aya_number).execute()
    return res.data[0] if res.data else {"error": "Not found"}

@app.get("/search")
def search(q: str):
    res = client.table("ayas").select("*").ilike("aya_text", f"%{q}%").execute()
    return {"query": q, "count": len(res.data), "results": res.data}

@app.get("/stats")
def stats():
    suras = client.table("suras").select("sura_id", count="exact").execute()
    ayas = client.table("ayas").select("id", count="exact").execute()
    return {"total_suras": suras.count, "total_ayas": ayas.count, "languages": ["tigrinya", "arabic", "arabic_transliteration", "english", "amharic"]}
@app.get("/cross-references/{surah}/{ayah}")
def get_cross_references(surah: int, ayah: int):
    res = client.table("cross_references")\
        .select("ref_surah, ref_ayah_start, ref_ayah_end")\
        .eq("source_surah", surah)\
        .eq("source_ayah", ayah)\
        .execute()
    return {"surah": surah, "ayah": ayah, "cross_references": res.data}
