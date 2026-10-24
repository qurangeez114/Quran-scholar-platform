alter table public.qh_external_sources add column search_document tsvector generated always as (to_tsvector('english',coalesce(title,'')||' '||coalesce(excerpt,''))) stored;
create index qh_external_sources_search_idx on public.qh_external_sources using gin(search_document);
create function public.qh_saved_external_search(q text,lim integer default 6)
returns setof public.qh_external_sources language sql stable security invoker set search_path='' as $$
 select s.* from public.qh_external_sources s
 where length(q) between 3 and 180 and s.review_status <> 'rejected'
 and s.search_document @@ websearch_to_tsquery('english',q)
 order by ts_rank(s.search_document,websearch_to_tsquery('english',q)) desc, s.retrieved_at desc
 limit greatest(0,least(coalesce(lim,6),10));
$$;
revoke all on function public.qh_saved_external_search(text,integer) from public;
grant execute on function public.qh_saved_external_search(text,integer) to anon,authenticated,service_role;
