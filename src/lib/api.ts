import { supabase } from './supabase'
import {
  saveCachedSettings,
  getCachedSettings,
  saveCachedMeals,
  getCachedMeals,
  saveCachedDailyTotals,
  getCachedDailyTotals,
  saveCachedWeeklyTotals,
  getCachedWeeklyTotals
} from './offline/db'
import type {
  UserSettings,
  MealEntry,
  MealGroup,
  MealUnit,
  DailyTotals,
  EstimateResponse,
  EstimatedItem,
  SimilarMeal,
  PortionLevel
} from '../types'

// User Settings
export async function fetchUserSettings(): Promise<UserSettings | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') throw error
    if (data) {
      await saveCachedSettings(data)
      localStorage.setItem('pana_last_user_id', data.user_id)
    }
    return data
  } catch (error) {
    console.warn('Network fetch failed, trying cache for user settings:', error)
    const userId = localStorage.getItem('pana_last_user_id')
    if (userId) {
      return await getCachedSettings(userId)
    }
    throw error
  }
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
  if (data) await saveCachedSettings(data)
  return data
}

// Meal Entries
export async function fetchMealEntries(dateLocal: string): Promise<MealEntry[]> {
  try {
    const { data, error } = await supabase
      .from('meal_entries')
      .select('*')
      .eq('date_local', dateLocal)
      .order('meal_group')
      .order('position')

    if (error) throw error
    const entries = data || []
    if (entries.length > 0) {
      await saveCachedMeals(entries)
    }
    return entries
  } catch (error) {
    console.warn('Network fetch failed, trying cache for meal entries:', error)
    return await getCachedMeals(dateLocal)
  }
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

// Insert multiple meal entries from a single estimation (multi-item support)
export async function insertMealEntries(
  items: EstimatedItem[],
  dateLocal: string,
  mealGroup: MealGroup,
  startPosition: number
): Promise<MealEntry[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const entries = items.map((item, index) => ({
    user_id: user.id,
    date_local: dateLocal,
    meal_group: mealGroup,
    position: startPosition + index,
    description: item.context_note
      ? `${item.normalized_name} (${item.context_note})`
      : item.normalized_name,
    quantity: item.quantity,
    unit: item.unit,
    calories_min: item.calories_min,
    calories_max: item.calories_max,
    protein_g_min: item.protein_g_min,
    protein_g_max: item.protein_g_max,
    carbs_g_min: item.carbs_g_min,
    carbs_g_max: item.carbs_g_max,
    fat_g_min: item.fat_g_min,
    fat_g_max: item.fat_g_max,
    alcohol_g: item.alcohol_g,
    alcohol_calories: item.alcohol_calories,
    base_calories_min: item.base_calories_min,
    base_calories_max: item.base_calories_max,
    base_protein_g_min: item.base_protein_g_min,
    base_protein_g_max: item.base_protein_g_max,
    base_carbs_g_min: item.base_carbs_g_min,
    base_carbs_g_max: item.base_carbs_g_max,
    base_fat_g_min: item.base_fat_g_min,
    base_fat_g_max: item.base_fat_g_max,
    base_alcohol_g: item.base_alcohol_g,
    base_alcohol_calories: item.base_alcohol_calories,
    uncertainty: item.uncertainty,
    portion_level: 'ok' as PortionLevel,
    last_estimated_at: new Date().toISOString()
  }))

  const { data, error } = await supabase
    .from('meal_entries')
    .insert(entries)
    .select()

  if (error) throw error
  return data
}

// Copy meal group to another date/group
export async function copyMealGroup(
  sourceMeals: MealEntry[],
  destinationDate: string,
  destinationGroup: MealGroup
): Promise<MealEntry[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (sourceMeals.length === 0) return []

  // Get existing meals at destination to determine start position
  const existingMeals = await fetchMealEntries(destinationDate)
  const groupMeals = existingMeals.filter(m => m.meal_group === destinationGroup)
  const startPosition = groupMeals.length > 0
    ? Math.max(...groupMeals.map(m => m.position)) + 1
    : 0

  const newEntries = sourceMeals.map((meal, index) => ({
    user_id: user.id,
    date_local: destinationDate,
    meal_group: destinationGroup,
    position: startPosition + index,
    description: meal.description,
    quantity: meal.quantity,
    unit: meal.unit,
    calories_min: meal.calories_min,
    calories_max: meal.calories_max,
    protein_g_min: meal.protein_g_min,
    protein_g_max: meal.protein_g_max,
    carbs_g_min: meal.carbs_g_min,
    carbs_g_max: meal.carbs_g_max,
    fat_g_min: meal.fat_g_min,
    fat_g_max: meal.fat_g_max,
    alcohol_g: meal.alcohol_g,
    alcohol_calories: meal.alcohol_calories,
    base_calories_min: meal.base_calories_min,
    base_calories_max: meal.base_calories_max,
    base_protein_g_min: meal.base_protein_g_min,
    base_protein_g_max: meal.base_protein_g_max,
    base_carbs_g_min: meal.base_carbs_g_min,
    base_carbs_g_max: meal.base_carbs_g_max,
    base_fat_g_min: meal.base_fat_g_min,
    base_fat_g_max: meal.base_fat_g_max,
    base_alcohol_g: meal.base_alcohol_g,
    base_alcohol_calories: meal.base_alcohol_calories,
    uncertainty: meal.uncertainty,
    portion_level: meal.portion_level,
    last_estimated_at: new Date().toISOString()
  }))

  const { data, error } = await supabase
    .from('meal_entries')
    .insert(newEntries)
    .select()

  if (error) throw error
  return data
}

// Update meal quantity with proportional macro recalculation
export async function updateMealQuantity(
  id: string,
  newQuantity: number,
  newUnit?: MealUnit
): Promise<MealEntry> {
  // First fetch the current entry to get base macros
  const { data: current, error: fetchError } = await supabase
    .from('meal_entries')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  // Check if base macros exist
  if (current.base_calories_min === null) {
    throw new Error('Cannot recalculate macros: base values not available for this entry')
  }

  // Calculate new macros proportionally
  const updates: Partial<MealEntry> = {
    quantity: newQuantity,
    calories_min: Math.round(current.base_calories_min * newQuantity),
    calories_max: Math.round(current.base_calories_max * newQuantity),
    protein_g_min: Math.round(current.base_protein_g_min * newQuantity * 10) / 10,
    protein_g_max: Math.round(current.base_protein_g_max * newQuantity * 10) / 10,
    carbs_g_min: Math.round(current.base_carbs_g_min * newQuantity * 10) / 10,
    carbs_g_max: Math.round(current.base_carbs_g_max * newQuantity * 10) / 10,
    fat_g_min: Math.round(current.base_fat_g_min * newQuantity * 10) / 10,
    fat_g_max: Math.round(current.base_fat_g_max * newQuantity * 10) / 10,
    alcohol_g: Math.round(current.base_alcohol_g * newQuantity * 10) / 10,
    alcohol_calories: Math.round(current.base_alcohol_calories * newQuantity),
  }

  if (newUnit) {
    updates.unit = newUnit
  }

  return updateMealEntry(id, updates)
}

// Daily Totals
export async function fetchDailyTotals(dateLocal: string): Promise<DailyTotals> {
  try {
    const { data, error } = await supabase.rpc('get_daily_totals', {
      target_date: dateLocal
    })

    if (error) throw error
    if (data) {
      await saveCachedDailyTotals(dateLocal, data as DailyTotals)
    }
    return data as DailyTotals
  } catch (error) {
    console.warn('Network fetch failed, trying cache for daily totals:', error)
    const cached = await getCachedDailyTotals(dateLocal)
    if (cached) return cached
    throw error
  }
}

// Weekly Totals
export async function fetchWeeklyTotals(weekStartDate: string): Promise<DailyTotals> {
  try {
    const { data, error } = await supabase.rpc('get_weekly_totals', {
      week_start_date: weekStartDate
    })

    if (error) throw error
    if (data) {
      await saveCachedWeeklyTotals(weekStartDate, data as DailyTotals)
    }
    return data as DailyTotals
  } catch (error) {
    console.warn('Network fetch failed, trying cache for weekly totals:', error)
    const cached = await getCachedWeeklyTotals(weekStartDate)
    if (cached) return cached
    throw error
  }
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
