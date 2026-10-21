-- Research search: conceptual (meaning-based) search with pgvector + hybrid ranking.
-- NOT applied automatically. Run manually after review, then run the backfill:
--   node scripts/embed_backfill.mjs   (needs OPENAI_API_KEY + SUPABASE_SERVICE_ROLE_KEY)
-- Embedding model assumed: OpenAI text-embedding-3-small (1536 dims). If you use
-- another model, change vector(1536) everywhere and in the backfill script.

create extension if not exists vector;

-- One table for all searchable passages keeps the RPC simple and leaves the
-- source tables untouched.
create table if not exists public.search_embeddings (
  id          bigserial primary key,
  src         text not null,           -- 'quran' | 'hadith' | 'tafsir' | ...
  ref_id      text not null,           -- e.g. '2:255', hadith uuid, tafsir id
  sura        int,
  aya         int,
  title       text,
  body        text not null,           -- the text that was embedded
  embedding   vector(1536),
  model       text default 'text-embedding-3-small',
  updated_at  timestamptz default now(),
  unique (src, ref_id)
);

create index if not exists search_embeddings_hnsw
  on public.search_embeddings using hnsw (embedding vector_cosine_ops);
create index if not exists search_embeddings_fts
  on public.search_embeddings using gin (to_tsvector('english', body));

alter table public.search_embeddings enable row level security;
drop policy if exists search_embeddings_read on public.search_embeddings;
create policy search_embeddings_read on public.search_embeddings for select to anon, authenticated using (true);
-- Writes only via service role (backfill script). No insert/update policy for anon.

-- Pure vector match.
create or replace function public.match_passages(
  query_embedding vector(1536), match_count int default 10, src_filter text default null)
returns table(src text, ref_id text, sura int, aya int, title text, body text, similarity float)
language sql stable
as $$
  select e.src, e.ref_id, e.sura, e.aya, e.title, e.body,
         1 - (e.embedding <=> query_embedding) as similarity
  from public.search_embeddings e
  where e.embedding is not null and (src_filter is null or e.src = src_filter)
  order by e.embedding <=> query_embedding
  limit least(match_count, 50);
$$;

-- Hybrid: reciprocal-rank fusion of keyword (full text) and vector results.
create or replace function public.hybrid_search(
  q text, query_embedding vector(1536), match_count int default 10,
  src_filter text default null, keyword_weight float default 1.0, semantic_weight float default 1.0,
  rrf_k int default 50)
returns table(src text, ref_id text, sura int, aya int, title text, body text, score float)
language sql stable
as $$
  with kw as (
    select e.id, row_number() over (order by ts_rank_cd(to_tsvector('english', e.body), websearch_to_tsquery('english', q)) desc) as r
    from public.search_embeddings e
    where to_tsvector('english', e.body) @@ websearch_to_tsquery('english', q)
      and (src_filter is null or e.src = src_filter)
    limit 200
  ),
  sem as (
    select e.id, row_number() over (order by e.embedding <=> query_embedding) as r
    from public.search_embeddings e
    where e.embedding is not null and (src_filter is null or e.src = src_filter)
    order by e.embedding <=> query_embedding
    limit 200
  )
  select e.src, e.ref_id, e.sura, e.aya, e.title, e.body,
         coalesce(keyword_weight / (rrf_k + kw.r), 0) + coalesce(semantic_weight / (rrf_k + sem.r), 0) as score
  from kw full outer join sem on kw.id = sem.id
  join public.search_embeddings e on e.id = coalesce(kw.id, sem.id)
  order by score desc
  limit least(match_count, 50);
$$;

grant execute on function public.match_passages(vector, int, text) to anon, authenticated;
grant execute on function public.hybrid_search(text, vector, int, text, float, float, int) to anon, authenticated;

-- Query-time embedding: the browser must not hold the embeddings API key.
-- Deploy a small Edge Function (e.g. supabase/functions/semantic-search) that:
--   1) receives {q, src, limit}, 2) calls the embeddings API with the secret
--   OPENAI_API_KEY, 3) calls rpc hybrid_search(q, embedding, ...), 4) returns rows.
-- research.html can then call it for conceptual queries (e.g. 3+ content words
-- or when keyword results are sparse) and merge into the Quran/hadith sections.
