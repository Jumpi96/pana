-- Add quantity and unit columns for meal entries
-- Enables tracking specific amounts (50g, 2 pieces, etc.)

-- Add columns if they don't exist (idempotent migration)
do $$
begin
  -- quantity column
  if not exists (select 1 from information_schema.columns where table_name = 'meal_entries' and column_name = 'quantity') then
    alter table meal_entries add column quantity numeric not null default 1 check (quantity > 0);
  end if;

  -- unit column
  if not exists (select 1 from information_schema.columns where table_name = 'meal_entries' and column_name = 'unit') then
    alter table meal_entries add column unit text not null default 'portion' check (unit in ('portion', 'g', 'ml', 'spoon', 'piece', 'cup'));
  end if;

  -- base macro columns for proportional recalculation
  if not exists (select 1 from information_schema.columns where table_name = 'meal_entries' and column_name = 'base_calories_min') then
    alter table meal_entries add column base_calories_min numeric check (base_calories_min is null or base_calories_min >= 0);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'meal_entries' and column_name = 'base_calories_max') then
    alter table meal_entries add column base_calories_max numeric check (base_calories_max is null or base_calories_max >= 0);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'meal_entries' and column_name = 'base_protein_g_min') then
    alter table meal_entries add column base_protein_g_min numeric check (base_protein_g_min is null or base_protein_g_min >= 0);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'meal_entries' and column_name = 'base_protein_g_max') then
    alter table meal_entries add column base_protein_g_max numeric check (base_protein_g_max is null or base_protein_g_max >= 0);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'meal_entries' and column_name = 'base_carbs_g_min') then
    alter table meal_entries add column base_carbs_g_min numeric check (base_carbs_g_min is null or base_carbs_g_min >= 0);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'meal_entries' and column_name = 'base_carbs_g_max') then
    alter table meal_entries add column base_carbs_g_max numeric check (base_carbs_g_max is null or base_carbs_g_max >= 0);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'meal_entries' and column_name = 'base_fat_g_min') then
    alter table meal_entries add column base_fat_g_min numeric check (base_fat_g_min is null or base_fat_g_min >= 0);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'meal_entries' and column_name = 'base_fat_g_max') then
    alter table meal_entries add column base_fat_g_max numeric check (base_fat_g_max is null or base_fat_g_max >= 0);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'meal_entries' and column_name = 'base_alcohol_g') then
    alter table meal_entries add column base_alcohol_g numeric check (base_alcohol_g is null or base_alcohol_g >= 0);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'meal_entries' and column_name = 'base_alcohol_calories') then
    alter table meal_entries add column base_alcohol_calories numeric check (base_alcohol_calories is null or base_alcohol_calories >= 0);
  end if;
end$$;

-- Add comments for documentation
comment on column meal_entries.quantity is 'Amount of the food item (e.g., 50 for 50g, 2 for 2 pieces)';
comment on column meal_entries.unit is 'Unit of measurement: portion, g, ml, spoon, piece, cup';
comment on column meal_entries.base_calories_min is 'Calories per 1 unit for proportional recalculation. NULL for legacy entries.';
