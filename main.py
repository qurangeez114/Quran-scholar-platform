from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse, RedirectResponse
import urllib.request
import urllib.parse
import urllib.error
import json
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://ylosytbxpzxzwfzjpaej.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json'
}

def sb_get(path):
    req = urllib.request.Request(SUPABASE_URL + path, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

@app.get('/')
def root():
    return RedirectResponse(url='https://fascinating-sunburst-516df8.netlify.app', status_code=301)

@app.get('/health')
def health():
    return {'status': 'ok', 'anthropic_key_set': bool(ANTHROPIC_API_KEY)}

@app.post('/claude')
async def call_claude(request: Request):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail='ANTHROPIC_API_KEY not configured')
    try:
        body = await request.json()
        payload = json.dumps(body).encode('utf-8')
        req = urllib.request.Request(
            'https://api.anthropic.com/v1/messages',
            data=payload,
            headers={
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        raise HTTPException(status_code=e.code, detail=error_body)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/suras')
def get_suras():
    return sb_get('/rest/v1/suras?select=*&order=sura_id.asc&limit=114')

@app.get('/verses')
def get_verses(surah: int = Query(...)):
    return sb_get(f'/rest/v1/ayas?sura_id=eq.{surah}&select=*&order=aya_number.asc&limit=286')

@app.get('/search')
def search_verses(q: str = Query(...), lang: str = Query(default='all'), limit: int = Query(default=200)):
    encoded = urllib.parse.quote(q)
    if lang == 'arabic':
        path = f'/rest/v1/ayas?arabic=ilike.*{encoded}*&select=sura_id,aya_number,arabic,english,aya_text&limit={limit}'
    elif lang == 'english':
        path = f'/rest/v1/ayas?english=ilike.*{encoded}*&select=sura_id,aya_number,arabic,english,aya_text&limit={limit}'
    else:
        path = f'/rest/v1/ayas?or=(arabic.ilike.*{encoded}*,english.ilike.*{encoded}*,aya_text.ilike.*{encoded}*)&select=sura_id,aya_number,arabic,english,aya_text&limit={limit}'
    return sb_get(path)

@app.get('/cross-references/{surah}/{ayah}')
def get_cross_refs(surah: int, ayah: int):
    return sb_get(f'/rest/v1/cross_references?surah_number=eq.{surah}&ayah_number=eq.{ayah}&select=*&limit=50')

@app.get('/word-analysis/{surah}/{ayah}')
def get_word_analysis(surah: int, ayah: int):
    return sb_get(f'/rest/v1/word_analysis?sura_id=eq.{surah}&aya_number=eq.{ayah}&select=*&order=word_position.asc')

@app.get('/chronological')
def get_chronological():
    return sb_get('/rest/v1/chronological_order?select=*&order=revelation_order.asc&limit=114')

@app.get('/stats')
def get_stats():
    try:
        suras = sb_get('/rest/v1/suras?select=sura_id&limit=1&offset=113')
        ayas = sb_get('/rest/v1/ayas?select=aya_number&limit=1&offset=6204')
        return {'suras': 114, 'ayas': 6205, 'status': 'ok'}
    except:
        return {'status': 'ok'}
