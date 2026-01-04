-- Add quantity and unit columns for meal entries
-- Enables tracking specific amounts (50g, 2 pieces, etc.)

ALTER TABLE meal_entries
ADD COLUMN quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0),
ADD COLUMN unit text NOT NULL DEFAULT 'portion'
  CHECK (unit IN ('portion', 'g', 'ml', 'spoon', 'piece', 'cup'));

-- Base macros for proportional recalculation when quantity changes
-- These store macros per 1 unit, allowing recalculation when user adjusts quantity
-- NULL for legacy entries (quantity editing disabled)
ALTER TABLE meal_entries
ADD COLUMN base_calories_min numeric CHECK (base_calories_min IS NULL OR base_calories_min >= 0),
ADD COLUMN base_calories_max numeric CHECK (base_calories_max IS NULL OR base_calories_max >= 0),
ADD COLUMN base_protein_g_min numeric CHECK (base_protein_g_min IS NULL OR base_protein_g_min >= 0),
ADD COLUMN base_protein_g_max numeric CHECK (base_protein_g_max IS NULL OR base_protein_g_max >= 0),
ADD COLUMN base_carbs_g_min numeric CHECK (base_carbs_g_min IS NULL OR base_carbs_g_min >= 0),
ADD COLUMN base_carbs_g_max numeric CHECK (base_carbs_g_max IS NULL OR base_carbs_g_max >= 0),
ADD COLUMN base_fat_g_min numeric CHECK (base_fat_g_min IS NULL OR base_fat_g_min >= 0),
ADD COLUMN base_fat_g_max numeric CHECK (base_fat_g_max IS NULL OR base_fat_g_max >= 0),
ADD COLUMN base_alcohol_g numeric CHECK (base_alcohol_g IS NULL OR base_alcohol_g >= 0),
ADD COLUMN base_alcohol_calories numeric CHECK (base_alcohol_calories IS NULL OR base_alcohol_calories >= 0);

-- Add comment for documentation
COMMENT ON COLUMN meal_entries.quantity IS 'Amount of the food item (e.g., 50 for 50g, 2 for 2 pieces)';
COMMENT ON COLUMN meal_entries.unit IS 'Unit of measurement: portion, g, ml, spoon, piece, cup';
COMMENT ON COLUMN meal_entries.base_calories_min IS 'Calories per 1 unit for proportional recalculation. NULL for legacy entries.';
