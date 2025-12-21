import { supabase } from './supabase'
import type {
  UserSettings,
  MealEntry,
  DailyTotals,
  EstimateResponse,
  SimilarMeal,
  PortionLevel
} from '../types'

// User Settings
export async function fetchUserSettings(): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data
}

export async function upsertUserSettings(settings: Partial<UserSettings>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      ...settings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

// Meal Entries
export async function fetchMealEntries(dateLocal: string): Promise<MealEntry[]> {
  const { data, error } = await supabase
    .from('meal_entries')
    .select('*')
    .eq('date_local', dateLocal)
    .order('meal_group')
    .order('position')

  if (error) throw error
  return data || []
}

export async function insertMealEntry(entry: Omit<MealEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('meal_entries')
    .insert({
      ...entry,
      user_id: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateMealEntry(id: string, updates: Partial<MealEntry>) {
  const { data, error } = await supabase
    .from('meal_entries')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteMealEntry(id: string) {
  const { error } = await supabase
    .from('meal_entries')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function updatePortionLevel(id: string, portionLevel: PortionLevel) {
  return updateMealEntry(id, { portion_level: portionLevel })
}

// Daily Totals
export async function fetchDailyTotals(dateLocal: string): Promise<DailyTotals> {
  const { data, error } = await supabase.rpc('get_daily_totals', {
    target_date: dateLocal
  })

  if (error) throw error
  return data as DailyTotals
}

// Weekly Totals
export async function fetchWeeklyTotals(weekStartDate: string): Promise<DailyTotals> {
  const { data, error } = await supabase.rpc('get_weekly_totals', {
    week_start_date: weekStartDate
  })

  if (error) throw error
  return data as DailyTotals
}

// Edge Functions

export async function estimateMeal(description: string): Promise<EstimateResponse> {
  const { data, error } = await supabase.functions.invoke('estimate_meal', {
    body: { description }
  })

  if (error) throw error
  return data
}

export async function searchSimilarMeals(query: string, limit = 5): Promise<SimilarMeal[]> {
  const { data, error } = await supabase.functions.invoke('search_similar_meals', {
    body: { query, limit }
  })

  if (error) throw error
  return data || []
}

export async function updateMealEmbedding(mealEntryId: string, description: string) {
  const { error } = await supabase.functions.invoke('update_meal_embedding', {
    body: { meal_entry_id: mealEntryId, description }
  })

  if (error) throw error
}
