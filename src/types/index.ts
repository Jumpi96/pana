export type MealGroup = 'breakfast' | 'lunch' | 'snack' | 'dinner'
export type PortionLevel = 'light' | 'ok' | 'heavy'

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

export interface EstimateResponse {
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
}
