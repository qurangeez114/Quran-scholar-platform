-- Explicit membership links supplement existing narrative version mappings.
create table public.qh_hadith_group_links (
 hadith_id bigint not null references public.hadith_corpus(id),
 group_id integer not null references public.narrative_groups(id),
 connection_note text not null,
 evidence_url text not null check(evidence_url ~ '^https://'),
 created_at timestamptz not null default now(),
 primary key(hadith_id,group_id)
);
create index qh_hadith_group_links_group_idx on public.qh_hadith_group_links(group_id);
alter table public.qh_hadith_group_links enable row level security;
create policy hadith_group_links_public_read on public.qh_hadith_group_links for select to anon,authenticated using(true);
grant select on public.qh_hadith_group_links to anon,authenticated;
grant all on public.qh_hadith_group_links to service_role;

insert into public.qh_hadith_group_links(hadith_id,group_id,connection_note,evidence_url)
select h.id,g.id,'Same named incident: Maiz ibn Malik. Event membership only; this does not establish that every version agrees or that stored edition numbers coincide.','https://sunnah.com/abudawud:4427'
from public.hadith_corpus h cross join public.narrative_groups g
where g.slug='maiz-ibn-malik-stoning' and h.collection='Sunan Abu Dawud' and h.hadith_number='4427'
 and (h.text_english ~* 'ma.{0,4}iz' or h.text_arabic like '%ماعز%')
on conflict do nothing;

create function public.qh_hadith_connections(p_hadith_id bigint,p_limit integer default 8)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
 current_report public.hadith_corpus%rowtype;
 group_ids integer[];
 similar_rows jsonb := '[]'::jsonb;
 contrasts jsonb := '[]'::jsonb;
 group_list jsonb := '[]'::jsonb;
 lim integer := greatest(1,least(coalesce(p_limit,8),12));
 terms text[];
 search_query tsquery;
begin
 select * into current_report from public.hadith_corpus where id=p_hadith_id;
 if not found then return jsonb_build_object('found',false); end if;
 select array_agg(distinct gid) into group_ids from (
  select narrative_group_id gid from public.narrative_versions
   where hadith_corpus_id=p_hadith_id or p_hadith_id=any(duplicate_of_corpus_ids)
  union select group_id from public.qh_hadith_group_links where hadith_id=p_hadith_id
 ) g;
 if cardinality(group_ids)>0 then
  select coalesce(jsonb_agg(jsonb_build_object('slug',slug,'title',title,'review_status',review_status)),'[]'::jsonb)
   into group_list from public.narrative_groups where id=any(group_ids);
  select coalesce(jsonb_agg(payload),'[]'::jsonb) into similar_rows from (
   select distinct on (v.hadith_corpus_id)
    jsonb_build_object('id',v.hadith_corpus_id,'collection',v.source_collection,'number',h.hadith_number,
    'catalogue_reference',v.source_reference,'external_reference',v.external_reference,'source_url',v.verified_url,
    'grade',h.grade,'grade_note',v.grade_note,'narrator',v.narrator,'text',left(h.text_english,600),
    'summary',v.version_summary,'match_type','same_narrative','citation_ambiguous',v.citation_ambiguous) payload
   from (select nv.id,nv.narrative_group_id,nv.hadith_corpus_id,nv.source_collection,nv.source_reference,nv.narrator,nv.version_summary,nv.citation_ambiguous,
  em.url verified_url,em.external_reference,null::text grade_note
 from public.narrative_versions nv left join lateral (
  select url,external_reference from public.external_reference_map m where m.hadith_corpus_id=nv.hadith_corpus_id
  order by verified_on desc nulls last,id limit 1
 ) em on true) v join public.hadith_corpus h on h.id=v.hadith_corpus_id
   where v.narrative_group_id=any(group_ids) and v.hadith_corpus_id<>p_hadith_id
    and md5(regexp_replace(coalesce(h.text_english,''),'\s+',' ','g'))<>md5(regexp_replace(coalesce(current_report.text_english,''),'\s+',' ','g'))
   order by v.hadith_corpus_id limit lim
  ) matches;
  select coalesce(jsonb_agg(payload order by is_direct desc,severity desc),'[]'::jsonb) into contrasts from (
   select c.severity,
    (a.hadith_corpus_id=p_hadith_id or b.hadith_corpus_id=p_hadith_id
     or exists(select 1 from public.narrative_versions n where n.id in(c.version_a_id,c.version_b_id) and p_hadith_id=any(n.duplicate_of_corpus_ids))) is_direct,
    jsonb_build_object('comparison_id',c.id,'type',c.comparison_type,'summary',c.comparison_summary,
     'explanation',c.possible_explanation,'review_status',coalesce(c.review_status,'unreviewed'),'confidence',c.confidence,
     'involves_current',a.hadith_corpus_id=p_hadith_id or b.hadith_corpus_id=p_hadith_id
       or exists(select 1 from public.narrative_versions n where n.id in(c.version_a_id,c.version_b_id) and p_hadith_id=any(n.duplicate_of_corpus_ids)),
     'a',jsonb_build_object('id',a.hadith_corpus_id,'collection',a.source_collection,'number',ha.hadith_number,
       'catalogue_reference',a.source_reference,'external_reference',a.external_reference,'source_url',a.verified_url,
       'grade',ha.grade,'text',left(ha.text_english,600),'citation_ambiguous',a.citation_ambiguous),
     'b',jsonb_build_object('id',b.hadith_corpus_id,'collection',b.source_collection,'number',hb.hadith_number,
       'catalogue_reference',b.source_reference,'external_reference',b.external_reference,'source_url',b.verified_url,
       'grade',hb.grade,'text',left(hb.text_english,600),'citation_ambiguous',b.citation_ambiguous)) payload
   from public.narrative_comparisons c
   join (select nv.id,nv.narrative_group_id,nv.hadith_corpus_id,nv.source_collection,nv.source_reference,nv.narrator,nv.version_summary,nv.citation_ambiguous,
  em.url verified_url,em.external_reference,null::text grade_note
 from public.narrative_versions nv left join lateral (
  select url,external_reference from public.external_reference_map m where m.hadith_corpus_id=nv.hadith_corpus_id
  order by verified_on desc nulls last,id limit 1
 ) em on true) a on a.id=c.version_a_id
   join (select nv.id,nv.narrative_group_id,nv.hadith_corpus_id,nv.source_collection,nv.source_reference,nv.narrator,nv.version_summary,nv.citation_ambiguous,
  em.url verified_url,em.external_reference,null::text grade_note
 from public.narrative_versions nv left join lateral (
  select url,external_reference from public.external_reference_map m where m.hadith_corpus_id=nv.hadith_corpus_id
  order by verified_on desc nulls last,id limit 1
 ) em on true) b on b.id=c.version_b_id
   join public.hadith_corpus ha on ha.id=a.hadith_corpus_id
   join public.hadith_corpus hb on hb.id=b.hadith_corpus_id
   where c.narrative_group_id=any(group_ids) and coalesce(c.review_status,'draft') not in ('rejected','invalid')
   order by is_direct desc,c.severity desc,c.id limit lim
  ) pairs;
 else
  -- Indexed word overlap is only a discovery aid, never a contradiction label.
  select array_agg(word) into terms from (
   select word from unnest(tsvector_to_array(to_tsvector('english',coalesce(current_report.text_english,'')))) word
   where word ~ '^[a-z]{4,}$' and word not in ('allah','messeng','prophet','narrat','said','report','apos','salli','sallam','upon','would','peac','author','ibn','word','prayer','praye')
   order by length(word) desc,word limit 6
  ) words;
  if cardinality(terms)>=3 then
   search_query := to_tsquery('english',array_to_string(terms,' | '));
   select coalesce(jsonb_agg(payload order by score desc),'[]'::jsonb) into similar_rows from (
    select score,jsonb_build_object('id',h.id,'collection',h.collection,'number',h.hadith_number,'grade',h.grade,
     'narrator',h.narrator,'text',left(h.text_english,600),'match_type','word_overlap','summary','Shares several indexed words. This is an automatic discovery suggestion; agreement and relevance have not been established.') payload
    from (
     with candidates as materialized (
      select h.* from public.hadith_corpus h
      where h.id<>p_hadith_id and to_tsvector('english',h.text_english) @@ search_query limit 300
     )
     select h.*,ts_rank(to_tsvector('english',h.text_english),search_query) score from candidates h
     order by score desc limit 100
    ) h
    where (select count(*) from unnest(terms) word where to_tsvector('english',h.text_english) @@ plainto_tsquery('english',word))>=3
     and md5(regexp_replace(coalesce(h.text_english,''),'\s+',' ','g'))<>md5(regexp_replace(coalesce(current_report.text_english,''),'\s+',' ','g'))
    order by score desc limit lim
   ) candidates;
  end if;
 end if;
 return jsonb_build_object('found',true,'similar',similar_rows,'comparisons',contrasts,'groups',group_list,
  'direct_comparison_count',(select count(*) from jsonb_array_elements(contrasts) x where (x->>'involves_current')::boolean));
end $$;
revoke all on function public.qh_hadith_connections(bigint,integer) from public;
grant execute on function public.qh_hadith_connections(bigint,integer) to anon,authenticated,service_role;
