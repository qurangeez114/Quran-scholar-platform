#!/usr/bin/env python3
"""Offline I06 R02 assertion/voice guard. No DB access."""
import copy,hashlib,json,pathlib
BASE=pathlib.Path(__file__).resolve().parents[1]/"data/tafsir/staging"
EXPECTED=json.loads("[{\"key\":\"108-I06-R02-DISMISSAL\",\"statement_en\":\"The report quotes al-As ibn Wa'il telling others to leave Muhammad alone.\",\"voice\":\"al-As ibn Wa'il\",\"assertion_kind\":\"reported_imperative\",\"clause_keys\":[\"dismissal\"],\"endorsement\":\"not_inferred\"},{\"key\":\"108-I06-R02-CHARACTERIZATION\",\"statement_en\":\"The report quotes al-As ibn Wa'il characterizing Muhammad as cut off, with no descendants.\",\"voice\":\"al-As ibn Wa'il\",\"assertion_kind\":\"reported_characterization\",\"clause_keys\":[\"no_descendants_speech\"],\"endorsement\":\"not_inferred\",\"atomicity_note\":\"Abtar and no-descendants retained together as the source's characterization and gloss; not an independently verified demographic claim.\"},{\"key\":\"108-I06-R02-MEMORY\",\"statement_en\":\"The report quotes al-As ibn Wa'il predicting that Muhammad's memory would cease when he died.\",\"voice\":\"al-As ibn Wa'il\",\"assertion_kind\":\"reported_conditional_prediction\",\"clause_keys\":[\"memory_prediction\"],\"endorsement\":\"not_inferred\"},{\"key\":\"108-I06-R02-REVELATION\",\"statement_en\":\"The narrative reported from Yazid ibn Ruman concludes that God revealed this surah.\",\"voice\":\"Yazid ibn Ruman within reported narrative\",\"assertion_kind\":\"reported_revelation_statement\",\"clause_keys\":[\"revelation_statement\"],\"endorsement\":\"not_inferred\"}]")
def read(n,sha):
 raw=(BASE/n).read_bytes()
 assert hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()==sha
 return json.loads(raw)
def validate(c,m):
 assert c["assertions"]==EXPECTED,"Assertion meaning or ownership changed"
 assert c["clause_locators"]==m["clauses"],"Clause map changed"
 assert c["reporting_metadata"]=={"compiler":"Ibn Kathir","printed_reporting_sequence":["Muhammad ibn Ishaq","Yazid ibn Ruman"],"upper_chain":None,"context_clause_keys":["reporting_frame","narrative_context"],"independence_state":"unknown","authentication":"not_assessed"}
 assert c["status"]=="semantic_candidate_not_physical_payload"
 assert "omitted" in c["fidelity"]["english_reporting_names"] and c["fidelity"]["arabic_controls_voice"] is True
 assert len(c["holds"])==4
 for k in ("database_written","publication_ready","chapter_complete"):assert c[k] is False
 for x in c["clause_locators"]:assert hashlib.sha256(x["text"].encode()).hexdigest()==x["sha256"]
def main():
 c=read("ibn-kathir-108-i06-r02-refined-semantic-candidate-2026-10-30.json","8196ca25cf0a90b0954acacf9f68d65debfe1ac9")
 m=read("ibn-kathir-108-i06-r02-clause-map-2026-10-30.json","5832e147d541183557eacd320e16aae6b52b3567")
 validate(c,m)
 changes=[
 lambda x:x["assertions"][0].update(voice="Ibn Kathir"),
 lambda x:x["assertions"][2].update(statement_en="Muhammad's memory ceased."),
 lambda x:x["assertions"][1].update(endorsement="endorsed"),
 lambda x:x["assertions"][3].update(voice="al-As ibn Wa'il"),
 lambda x:x["reporting_metadata"].update(upper_chain=["invented"]),
 lambda x:x.update(publication_ready=True),
 lambda x:x.update(holds=[]),
 lambda x:x["assertions"][2].update(clause_keys=["revelation_statement"]),
 ]
 for change in changes:
  bad=copy.deepcopy(c);change(bad)
  try:validate(bad,m)
  except AssertionError:continue
  raise AssertionError("Unsafe mutation accepted")
 print("PASS exact I06 R02 assertions, voices and clause hashes; 8 unsafe cases rejected")
if __name__=="__main__":main()
