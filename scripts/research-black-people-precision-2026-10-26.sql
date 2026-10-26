-- Apply after research-facets-and-paraphrase-2026-10-26.sql.
-- Narrow color-related People matches: black mud is nature, not black skin.
-- Production database patched and verified 2026-10-26.
DO $patch$
DECLARE
 definition text;
 start_at int;
 end_at int;
BEGIN
 SELECT pg_get_functiondef('public.qh_research_facet_check(text,text,text)'::regprocedure)
 INTO definition;
 start_at:=position('WHEN ''people'' THEN ''(black.{0,38}' in definition);
 end_at:=position('     WHEN ''places'' THEN' in definition);
 IF start_at=0 THEN
   IF position('black.{0,24}' in definition)>0 THEN RETURN; END IF;
   RAISE EXCEPTION 'Unexpected facet definition; inspect before patching';
 END IF;
 IF end_at<=start_at THEN RAISE EXCEPTION 'Missing next facet';END IF;
 definition:=substr(definition,1,start_at-1)||
$replacement$WHEN 'people' THEN '(black.{0,24}(man|men|woman|women|person|people|slave|girl|boy|child|skin|face|faces|hair|african)|(face|faces|skin|hair).{0,36}black|(man|men|woman|women|person|people|slave|girl|boy|child).{0,12}black)'
$replacement$||substr(definition,end_at);
 EXECUTE definition;
END $patch$;
