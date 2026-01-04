export type MealGroup = 'breakfast' | 'lunch' | 'snack' | 'dinner'
export type PortionLevel = 'light' | 'ok' | 'heavy'
export type MealUnit = 'portion' | 'g' | 'ml' | 'spoon' | 'piece' | 'cup'

export interface UserSettings {
  user_id: string
  daily_calories_target: number
  protein_pct: number
  carbs_pct: number
  fat_pct: number
  created_at: string
  updated_at: string
}

export interface MealEntry {
  id: string
  user_id: string
  date_local: string // YYYY-MM-DD
  meal_group: MealGroup
  position: number
  description: string
  // Quantity and unit
  quantity: number
  unit: MealUnit
  // Current macros (for displayed quantity)
  calories_min: number
  calories_max: number
  protein_g_min: number
  protein_g_max: number
  carbs_g_min: number
  carbs_g_max: number
  fat_g_min: number
  fat_g_max: number
  alcohol_g: number
  alcohol_calories: number
  // Base macros per 1 unit (for recalculation) - null for legacy entries
  base_calories_min: number | null
  base_calories_max: number | null
  base_protein_g_min: number | null
  base_protein_g_max: number | null
  base_carbs_g_min: number | null
  base_carbs_g_max: number | null
  base_fat_g_min: number | null
  base_fat_g_max: number | null
  base_alcohol_g: number | null
  base_alcohol_calories: number | null
  uncertainty: boolean
  portion_level: PortionLevel
  created_at: string
  updated_at: string
  last_estimated_at?: string | null
}

export interface MealEmbedding {
  meal_entry_id: string
  user_id: string
  embedding: number[]
  created_at: string
  updated_at: string
}

export interface SimilarMeal {
  id: string
  description: string
  quantity: number
  unit: MealUnit
  calories_min: number
  calories_max: number
  protein_g_min: number
  protein_g_max: number
  carbs_g_min: number
  carbs_g_max: number
  fat_g_min: number
  fat_g_max: number
  alcohol_g: number
  alcohol_calories: number
  base_calories_min: number | null
  base_calories_max: number | null
  base_protein_g_min: number | null
  base_protein_g_max: number | null
  base_carbs_g_min: number | null
  base_carbs_g_max: number | null
  base_fat_g_min: number | null
  base_fat_g_max: number | null
  base_alcohol_g: number | null
  base_alcohol_calories: number | null
  uncertainty: boolean
  date_local: string
  similarity: number
}

export interface DailyTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface ExpectedMacros {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

// Single estimated item from AI
export interface EstimatedItem {
  normalized_name: string
  quantity: number
  unit: MealUnit
  context_note: string | null
  // Current macros (for specified quantity)
  calories_min: number
  calories_max: number
  protein_g_min: number
  protein_g_max: number
  carbs_g_min: number
  carbs_g_max: number
  fat_g_min: number
  fat_g_max: number
  alcohol_g: number
  alcohol_calories: number
  uncertainty: boolean
  // Base macros (per 1 unit, for recalculation)
  base_calories_min: number
  base_calories_max: number
  base_protein_g_min: number
  base_protein_g_max: number
  base_carbs_g_min: number
  base_carbs_g_max: number
  base_fat_g_min: number
  base_fat_g_max: number
  base_alcohol_g: number
  base_alcohol_calories: number
}

// Response from estimate_meal edge function (may contain multiple items)
export interface EstimateResponse {
  items: EstimatedItem[]
}
