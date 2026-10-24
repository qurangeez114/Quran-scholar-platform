-- Search both event narratives and campaign Sira passages; no new public writes.
create index if not exists qh_sira_events_fts on public.sira_events using gin
(to_tsvector('english',coalesce(title_en,'')||' '||coalesce(story_en,'')||' '||coalesce(title_ar,'')||' '||coalesce(story_ar,'')));
create index if not exists qh_campaign_sirah_fts on public.campaign_sirah using gin
(to_tsvector('english',coalesce(topic,'')||' '||coalesce(english_text,'')||' '||coalesce(arabic_text,'')));

create or replace function public.qh_sira_search(q text, lim integer default 8)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare nq text:=left(lower(trim(coalesce(q,''))),180); tokens text[]; tq tsquery; rows jsonb; cnt int;
begin
 nq:=regexp_replace(nq,'\m(mohammed|mohammad|muhammed)\M','muhammad','g');
 nq:=regexp_replace(nq,'\m(safiya|safiyah|safiyyah)\M','safiyya','g');
 -- Sofia is ambiguous: expand only within this historical context, and disclose it.
 if nq ~ '\msofia\M' and nq ~ '(captur|kh[ae]ybar|muhammad|marri|tent)' then nq:=regexp_replace(nq,'\msofia\M','safiyya','g'); end if;
 nq:=regexp_replace(nq,'\mayub\M','ayyub','g');
 select array_agg(distinct lexeme) into tokens from unnest(tsvector_to_array(to_tsvector('english',nq))) lexeme
 where lexeme not in ('say','said','hadith','search','right','away','immedi','word','result','find');
 if coalesce(cardinality(tokens),0)=0 then return jsonb_build_object('key','sira','count',0,'rows','[]'::jsonb,'variants',jsonb_build_array(nq)); end if;
 select to_tsquery('english',string_agg(case x when 'safiyya' then '(safiyya | safiyyah | safiya | safiyah)' when 'muhammad' then '(muhammad | mohammed | mohammad | muhammed)' when 'ayyub' then '(ayyub | ayub)' else quote_literal(x) end,' | ')) into tq from unnest(tokens) x;
 with docs as (
 select 'event:'||id as id,title_en as title,story_en as text,story_ar as arabic,source_ref,year_ce as year,
 to_tsvector('english',coalesce(title_en,'')||' '||coalesce(story_en,'')||' '||coalesce(title_ar,'')||' '||coalesce(story_ar,'')) as doc
 from public.sira_events
 where to_tsvector('english',coalesce(title_en,'')||' '||coalesce(story_en,'')||' '||coalesce(title_ar,'')||' '||coalesce(story_ar,'')) @@ tq
 union all
 select 'campaign:'||id,topic,english_text,arabic_text,concat_ws(' — ',author,work,reliability,notes),null,
 to_tsvector('english',coalesce(topic,'')||' '||coalesce(english_text,'')||' '||coalesce(arabic_text,''))
 from public.campaign_sirah
 where to_tsvector('english',coalesce(topic,'')||' '||coalesce(english_text,'')||' '||coalesce(arabic_text,'')) @@ tq
 ), scored as (
 select *, (select count(*) from unnest(tokens) t where doc @@ case t when 'safiyya' then to_tsquery('english','safiyya | safiyyah | safiya | safiyah') when 'muhammad' then to_tsquery('english','muhammad | mohammed | mohammad | muhammed') when 'ayyub' then to_tsquery('english','ayyub | ayub') else plainto_tsquery('english',t) end) as hits,ts_rank_cd(doc,tq) as rank from docs
 ), unique_docs as (
 select distinct on (coalesce(text,''),coalesce(source_ref,'')) * from scored where hits>=least(2,cardinality(tokens)) order by coalesce(text,''),coalesce(source_ref,''),rank desc
 ), ranked as (
 select *,row_number() over(order by hits desc,rank desc,id) rn from unique_docs
 )
 select count(*),coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'text',text,'arabic',arabic,'source_ref',source_ref,'year',year) order by rn) filter(where rn<=greatest(1,least(coalesce(lim,8),100))),'[]'::jsonb)
 into cnt,rows from ranked;
 return jsonb_build_object('key','sira','label','Sira (life of the Prophet)','count',cnt,'rows',rows,'variants',jsonb_build_array(nq),'keyword_match',true,'relaxed',false);
end $$;
revoke all on function public.qh_sira_search(text,integer) from public;
grant execute on function public.qh_sira_search(text,integer) to anon,authenticated,service_role;

-- Original editorial synopsis, not an imported modern translation or authenticity ruling.
insert into public.sira_events(id,title_en,title_ar,period,year_ah,story_en,story_ar,key_figures,location,source_ref)
values ('safiyya-abu-ayyub-tent','Safiyya at Khaybar: Abu Ayyub guards the marriage tent','صفية وحراسة أبي أيوب للقبة','Medinan',7,
'Ibn Ishaq, as preserved by Ibn Hisham, reports that Muhammad spent the night with Safiyya in his tent when their marriage was consummated at Khaybar or along the return route. Safiyya had been captured at Khaybar. Abu Ayyub (also spelled Abu Ayub) carried a sword and guarded the tent outside until morning, fearing that she might harm or kill Muhammad. Asked why he stayed on guard while Muhammad slept with her, he referred to the deaths of her father, husband and people, and to her recent departure from unbelief. The report describes the guard’s fear; it does not report an attack by Safiyya. It does not establish intercourse immediately after capture or specify an exact interval. Source type: Sira narrative. This is an editorial synopsis; no sahih grading is assigned here. Related marriage-timing reports: Bukhari 4211 and 4212; Muslim 1365f. These parallel reports do not themselves contain this tent-guard episode.',
'وبات أبو أيوب خالد بن زيد، أخو بني النجار متوشحا سيفه، يحرس رسول الله ويطيف بالقبة، حتى أصبح رسول الله. قال: يا رسول الله، خفت عليك من هذه المرأة، وكانت امرأة قد قتلت أباها وزوجها وقومها، وكانت حديثة عهد بكفر، فخفتها عليك.',
array['Safiyya bint Huyayy','Abu Ayyub al-Ansari','Muhammad'],'Khaybar or the return route',
'Ibn Ishaq, transmitted by Ibn Hisham, al-Sira al-Nabawiyya; Khaybar section: consummation with Safiyya and Abu Ayyub guarding the tent. Arabic passage and translation: https://hadithunlocked.com/ibnhisham/74/6 (site passage identifier 1318; not universal Hadith numbering).')
on conflict(id) do nothing;
