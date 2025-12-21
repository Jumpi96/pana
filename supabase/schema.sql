-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- User Settings Table
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_calories_target integer not null default 2000 check (daily_calories_target > 0),
  protein_pct numeric not null default 30 check (protein_pct >= 0 and protein_pct <= 100),
  carbs_pct numeric not null default 40 check (carbs_pct >= 0 and carbs_pct <= 100),
  fat_pct numeric not null default 30 check (fat_pct >= 0 and fat_pct <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Ensure percentages sum to 100
  constraint macro_percentages_sum check (protein_pct + carbs_pct + fat_pct = 100)
);

-- Meal Entries Table
create table meal_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_local date not null,
  meal_group text not null check (meal_group in ('breakfast', 'lunch', 'snack', 'dinner')),
  position integer not null default 0,
  description text not null check (char_length(description) <= 140),

  -- Macro ranges
  calories_min numeric not null check (calories_min >= 0),
  calories_max numeric not null check (calories_max >= calories_min),
  protein_g_min numeric not null check (protein_g_min >= 0),
  protein_g_max numeric not null check (protein_g_max >= protein_g_min),
  carbs_g_min numeric not null check (carbs_g_min >= 0),
  carbs_g_max numeric not null check (carbs_g_max >= carbs_g_min),
  fat_g_min numeric not null check (fat_g_min >= 0),
  fat_g_max numeric not null check (fat_g_max >= fat_g_min),

  -- Alcohol (no ranges, exact values)
  alcohol_g numeric not null default 0 check (alcohol_g >= 0),
  alcohol_calories numeric not null default 0 check (alcohol_calories >= 0),

  -- Uncertainty and portion selection
  uncertainty boolean not null default false,
  portion_level text not null default 'ok' check (portion_level in ('light', 'ok', 'heavy')),

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_estimated_at timestamptz,

  -- Composite unique constraint for idempotency
  unique(user_id, date_local, meal_group, position)
);

-- Indexes for meal_entries
create index idx_meal_entries_user_date on meal_entries(user_id, date_local);
create index idx_meal_entries_user_date_group on meal_entries(user_id, date_local, meal_group, position);

-- Meal Embeddings Table (pgvector)
create table meal_embeddings (
  meal_entry_id uuid primary key references meal_entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  embedding vector(1536) not null, -- OpenAI text-embedding-3-small dimension
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for meal_embeddings
create index idx_meal_embeddings_user on meal_embeddings(user_id);

-- Vector similarity index (using HNSW for better performance)
-- Note: HNSW is preferred over IVFFlat for better query performance
create index idx_meal_embeddings_vector on meal_embeddings
  using hnsw (embedding vector_cosine_ops);

-- RLS Policies

-- user_settings
alter table user_settings enable row level security;

create policy "Users can view their own settings"
  on user_settings for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own settings"
  on user_settings for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own settings"
  on user_settings for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own settings"
  on user_settings for delete
  to authenticated
  using (user_id = auth.uid());

-- meal_entries
alter table meal_entries enable row level security;

create policy "Users can view their own meal entries"
  on meal_entries for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own meal entries"
  on meal_entries for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own meal entries"
  on meal_entries for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own meal entries"
  on meal_entries for delete
  to authenticated
  using (user_id = auth.uid());

-- meal_embeddings
alter table meal_embeddings enable row level security;

create policy "Users can view their own embeddings"
  on meal_embeddings for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own embeddings"
  on meal_embeddings for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own embeddings"
  on meal_embeddings for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own embeddings"
  on meal_embeddings for delete
  to authenticated
  using (user_id = auth.uid());

-- Trigger to update updated_at timestamps
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_user_settings_updated_at
  before update on user_settings
  for each row
  execute function update_updated_at_column();

create trigger update_meal_entries_updated_at
  before update on meal_entries
  for each row
  execute function update_updated_at_column();

create trigger update_meal_embeddings_updated_at
  before update on meal_embeddings
  for each row
  execute function update_updated_at_column();
