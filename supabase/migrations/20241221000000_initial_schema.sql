-- Initial schema for Pana app
-- This migration creates the base tables if they don't exist

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- User Settings Table
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_calories_target integer not null default 2000 check (daily_calories_target > 0),
  protein_pct numeric not null default 30 check (protein_pct >= 0 and protein_pct <= 100),
  carbs_pct numeric not null default 40 check (carbs_pct >= 0 and carbs_pct <= 100),
  fat_pct numeric not null default 30 check (fat_pct >= 0 and fat_pct <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint macro_percentages_sum check (protein_pct + carbs_pct + fat_pct = 100)
);

-- Meal Entries Table
create table if not exists meal_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_local date not null,
  meal_group text not null check (meal_group in ('breakfast', 'lunch', 'snack', 'dinner')),
  position integer not null default 0,
  description text not null check (char_length(description) <= 140),
  calories_min numeric not null check (calories_min >= 0),
  calories_max numeric not null check (calories_max >= calories_min),
  protein_g_min numeric not null check (protein_g_min >= 0),
  protein_g_max numeric not null check (protein_g_max >= protein_g_min),
  carbs_g_min numeric not null check (carbs_g_min >= 0),
  carbs_g_max numeric not null check (carbs_g_max >= carbs_g_min),
  fat_g_min numeric not null check (fat_g_min >= 0),
  fat_g_max numeric not null check (fat_g_max >= fat_g_min),
  alcohol_g numeric not null default 0 check (alcohol_g >= 0),
  alcohol_calories numeric not null default 0 check (alcohol_calories >= 0),
  uncertainty boolean not null default false,
  portion_level text not null default 'ok' check (portion_level in ('light', 'ok', 'heavy')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_estimated_at timestamptz,
  unique(user_id, date_local, meal_group, position)
);

-- Meal Embeddings Table
create table if not exists meal_embeddings (
  meal_entry_id uuid primary key references meal_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes (create if not exists not supported, so we use DO blocks)
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'idx_meal_entries_user_date') then
    create index idx_meal_entries_user_date on meal_entries(user_id, date_local);
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'idx_meal_entries_user_date_group') then
    create index idx_meal_entries_user_date_group on meal_entries(user_id, date_local, meal_group, position);
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'idx_meal_embeddings_user') then
    create index idx_meal_embeddings_user on meal_embeddings(user_id);
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'idx_meal_embeddings_vector') then
    create index idx_meal_embeddings_vector on meal_embeddings using hnsw (embedding vector_cosine_ops);
  end if;
end$$;

-- RLS Policies (using DO blocks to check existence)
alter table user_settings enable row level security;
alter table meal_entries enable row level security;
alter table meal_embeddings enable row level security;

do $$
begin
  -- user_settings policies
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own settings' and tablename = 'user_settings') then
    create policy "Users can view their own settings" on user_settings for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own settings' and tablename = 'user_settings') then
    create policy "Users can insert their own settings" on user_settings for insert to authenticated with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update their own settings' and tablename = 'user_settings') then
    create policy "Users can update their own settings" on user_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own settings' and tablename = 'user_settings') then
    create policy "Users can delete their own settings" on user_settings for delete to authenticated using (user_id = auth.uid());
  end if;

  -- meal_entries policies
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own meal entries' and tablename = 'meal_entries') then
    create policy "Users can view their own meal entries" on meal_entries for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own meal entries' and tablename = 'meal_entries') then
    create policy "Users can insert their own meal entries" on meal_entries for insert to authenticated with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update their own meal entries' and tablename = 'meal_entries') then
    create policy "Users can update their own meal entries" on meal_entries for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own meal entries' and tablename = 'meal_entries') then
    create policy "Users can delete their own meal entries" on meal_entries for delete to authenticated using (user_id = auth.uid());
  end if;

  -- meal_embeddings policies
  if not exists (select 1 from pg_policies where policyname = 'Users can view their own embeddings' and tablename = 'meal_embeddings') then
    create policy "Users can view their own embeddings" on meal_embeddings for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own embeddings' and tablename = 'meal_embeddings') then
    create policy "Users can insert their own embeddings" on meal_embeddings for insert to authenticated with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update their own embeddings' and tablename = 'meal_embeddings') then
    create policy "Users can update their own embeddings" on meal_embeddings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can delete their own embeddings' and tablename = 'meal_embeddings') then
    create policy "Users can delete their own embeddings" on meal_embeddings for delete to authenticated using (user_id = auth.uid());
  end if;
end$$;

-- Trigger function for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers if they don't exist
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'update_user_settings_updated_at') then
    create trigger update_user_settings_updated_at before update on user_settings for each row execute function update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'update_meal_entries_updated_at') then
    create trigger update_meal_entries_updated_at before update on meal_entries for each row execute function update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'update_meal_embeddings_updated_at') then
    create trigger update_meal_embeddings_updated_at before update on meal_embeddings for each row execute function update_updated_at_column();
  end if;
end$$;
