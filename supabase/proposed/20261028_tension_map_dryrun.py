"""Dry run (read-only): recompute exact expected counts for 20261028_tension_map_crossrefs.sql from live data.
Usage: SUPABASE_ACCESS_TOKEN=... python3 20261028_tension_map_dryrun.py   (token is never printed)"""
import os,json,re,urllib.request
P='ylosytbxpzxzwfzjpaej'; TH='Tension: Confirmation vs Alteration Claim'
def q(sql):
    r=urllib.request.Request(f'https://api.supabase.com/v1/projects/{P}/database/query',data=json.dumps({'query':sql,'read_only':True}).encode(),
        headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json','User-Agent':'dryrun'})
    return json.load(urllib.request.urlopen(r))
sql=open(os.path.join(os.path.dirname(__file__),'20261028_tension_map_crossrefs.sql')).read()
vals=re.findall(r"\((\d+),(\d+),(\d+),(\d+),'([^']+)'\)",sql)
print('rows in SQL:',len(vals),' unordered pairs:',len({tuple(sorted([(a,b),(c,d)])) for a,b,c,d,_ in vals}))
print('theme rows already live:',q(f"select count(*) c from thematic_cross_references_v2 where theme='{TH}'")[0]['c'])
vl=','.join(f"({a},{b})" for a,b in {(a,b) for a,b,*_ in vals})
print('referenced verses present in ayas:',q(f"select count(*) c from ayas where (sura_id,aya_number) in ({vl})")[0]['c'],'of',len({(a,b) for a,b,*_ in vals}))
for s in ['Torah; explicit','Torah; contextual','Gospel','Zabur']:
    print(s,sum(s in r for *_,r in vals))
