-- Get Daily Totals for a specific date
-- Calculates resolved values based on portion_level (light/ok/heavy)
create or replace function get_daily_totals(target_date date)
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  select json_build_object(
    'calories', coalesce(sum(
      case
        when portion_level = 'light' then calories_min
        when portion_level = 'heavy' then calories_max
        else (calories_min + calories_max) / 2.0
      end + alcohol_calories
    ), 0),
    'protein_g', coalesce(sum(
      case
        when portion_level = 'light' then protein_g_min
        when portion_level = 'heavy' then protein_g_max
        else (protein_g_min + protein_g_max) / 2.0
      end
    ), 0),
    'carbs_g', coalesce(sum(
      case
        when portion_level = 'light' then carbs_g_min
        when portion_level = 'heavy' then carbs_g_max
        else (carbs_g_min + carbs_g_max) / 2.0
      end
    ), 0),
    'fat_g', coalesce(sum(
      case
        when portion_level = 'light' then fat_g_min
        when portion_level = 'heavy' then fat_g_max
        else (fat_g_min + fat_g_max) / 2.0
      end
    ), 0)
  )
  into result
  from meal_entries
  where user_id = auth.uid()
    and date_local = target_date;

  return result;
end;
$$;

-- Get Weekly Totals (Monday-Sunday)
-- Sums up all meals from week_start_date to week_start_date + 6 days
create or replace function get_weekly_totals(week_start_date date)
returns json
language plpgsql
security definer
as $$
declare
  result json;
  week_end_date date;
begin
  -- Calculate week end (Sunday, 6 days after Monday)
  week_end_date := week_start_date + interval '6 days';

  select json_build_object(
    'calories', coalesce(sum(
      case
        when portion_level = 'light' then calories_min
        when portion_level = 'heavy' then calories_max
        else (calories_min + calories_max) / 2.0
      end + alcohol_calories
    ), 0),
    'protein_g', coalesce(sum(
      case
        when portion_level = 'light' then protein_g_min
        when portion_level = 'heavy' then protein_g_max
        else (protein_g_min + protein_g_max) / 2.0
      end
    ), 0),
    'carbs_g', coalesce(sum(
      case
        when portion_level = 'light' then carbs_g_min
        when portion_level = 'heavy' then carbs_g_max
        else (carbs_g_min + carbs_g_max) / 2.0
      end
    ), 0),
    'fat_g', coalesce(sum(
      case
        when portion_level = 'light' then fat_g_min
        when portion_level = 'heavy' then fat_g_max
        else (fat_g_min + fat_g_max) / 2.0
      end
    ), 0)
  )
  into result
  from meal_entries
  where user_id = auth.uid()
    and date_local >= week_start_date
    and date_local <= week_end_date;

  return result;
end;
$$;

-- Search Similar Meals using vector similarity
-- Returns meals with full data sorted by cosine similarity
create or replace function search_similar_meals_vector(
  query_embedding vector(1536),
  match_limit int default 10
)
returns table (
  id uuid,
  description text,
  calories_min integer,
  calories_max integer,
  protein_g_min numeric,
  protein_g_max numeric,
  carbs_g_min numeric,
  carbs_g_max numeric,
  fat_g_min numeric,
  fat_g_max numeric,
  alcohol_g numeric,
  alcohol_calories integer,
  uncertainty boolean,
  date_local date,
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
  select
    me.id,
    me.description,
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
    me.uncertainty,
    me.date_local,
    1 - (meb.embedding <=> query_embedding) as similarity
  from meal_embeddings meb
  join meal_entries me on me.id = meb.meal_entry_id
  where meb.user_id = auth.uid()
    and 1 - (meb.embedding <=> query_embedding) > 0.5  -- Minimum 50% similarity
  order by meb.embedding <=> query_embedding
  limit match_limit;
end;
$$;

-- Copy meal estimates from an existing meal
-- Used when clicking a similar meal suggestion
create or replace function copy_meal_estimates(source_meal_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  select json_build_object(
    'calories_min', calories_min,
    'calories_max', calories_max,
    'protein_g_min', protein_g_min,
    'protein_g_max', protein_g_max,
    'carbs_g_min', carbs_g_min,
    'carbs_g_max', carbs_g_max,
    'fat_g_min', fat_g_min,
    'fat_g_max', fat_g_max,
    'alcohol_g', alcohol_g,
    'alcohol_calories', alcohol_calories,
    'uncertainty', uncertainty
  )
  into result
  from meal_entries
  where id = source_meal_id
    and user_id = auth.uid();

  return result;
end;
$$;
