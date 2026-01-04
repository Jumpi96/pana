-- Migrate embeddings from OpenAI (1536 dimensions) to Google (768 dimensions)
-- This requires dropping and recreating the embedding column and clearing existing data

-- Drop existing index
drop index if exists idx_meal_embeddings_vector;

-- Alter the embedding column to use 768 dimensions (Google text-embedding-004)
alter table meal_embeddings
  alter column embedding type vector(768);

-- Recreate the HNSW index for the new dimension
create index idx_meal_embeddings_vector
  on meal_embeddings
  using hnsw (embedding vector_cosine_ops);

-- Clear existing embeddings (they need to be regenerated with the new model)
-- New embeddings will be generated automatically when meals are created/updated
truncate table meal_embeddings;

-- Update the search function to work with 768-dimensional vectors
create or replace function search_similar_meals_vector(
  query_embedding vector(768),
  match_limit int default 5
)
returns table (
  id uuid,
  description text,
  quantity numeric,
  unit text,
  calories_min numeric,
  calories_max numeric,
  protein_g_min numeric,
  protein_g_max numeric,
  carbs_g_min numeric,
  carbs_g_max numeric,
  fat_g_min numeric,
  fat_g_max numeric,
  alcohol_g numeric,
  alcohol_calories numeric,
  base_calories_min numeric,
  base_calories_max numeric,
  base_protein_g_min numeric,
  base_protein_g_max numeric,
  base_carbs_g_min numeric,
  base_carbs_g_max numeric,
  base_fat_g_min numeric,
  base_fat_g_max numeric,
  base_alcohol_g numeric,
  base_alcohol_calories numeric,
  uncertainty boolean,
  date_local date,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    me.id,
    me.description,
    me.quantity,
    me.unit,
    me.calories_min,
    me.calories_max,
    me.protein_g_min,
    me.protein_g_max,
    me.carbs_g_min,
    me.carbs_g_max,
    me.fat_g_min,
    me.fat_g_max,
    me.alcohol_g,
    me.alcohol_calories,
    me.base_calories_min,
    me.base_calories_max,
    me.base_protein_g_min,
    me.base_protein_g_max,
    me.base_carbs_g_min,
    me.base_carbs_g_max,
    me.base_fat_g_min,
    me.base_fat_g_max,
    me.base_alcohol_g,
    me.base_alcohol_calories,
    me.uncertainty,
    me.date_local,
    1 - (emb.embedding <=> query_embedding) as similarity
  from meal_embeddings emb
  join meal_entries me on me.id = emb.meal_entry_id
  where emb.user_id = auth.uid()
  order by emb.embedding <=> query_embedding
  limit match_limit;
end;
$$;
