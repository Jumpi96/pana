import type { UserSettings, ExpectedMacros, MealEntry, PortionLevel } from '../types'

export function calculateExpectedMacros(settings: UserSettings): ExpectedMacros {
  const calories = settings.daily_calories_target

  // Protein: 4 cal/g
  const protein_g = (calories * settings.protein_pct / 100) / 4

  // Carbs: 4 cal/g
  const carbs_g = (calories * settings.carbs_pct / 100) / 4

  // Fat: 9 cal/g
  const fat_g = (calories * settings.fat_pct / 100) / 9

  return {
    calories,
    protein_g,
    carbs_g,
    fat_g
  }
}

export function resolveValue(min: number, max: number, level: PortionLevel): number {
  if (level === 'light') return min
  if (level === 'heavy') return max
  return (min + max) / 2
}

export function calculateMealMacros(meal: MealEntry) {
  return {
    calories: resolveValue(meal.calories_min, meal.calories_max, meal.portion_level) + meal.alcohol_calories,
    protein_g: resolveValue(meal.protein_g_min, meal.protein_g_max, meal.portion_level),
    carbs_g: resolveValue(meal.carbs_g_min, meal.carbs_g_max, meal.portion_level),
    fat_g: resolveValue(meal.fat_g_min, meal.fat_g_max, meal.portion_level),
  }
}

export function calculateWeeklyRebalance(
  actualTotal: number,
  expectedTotal: number,
  daysElapsed: number,
  daysRemaining: number
): number {
  if (daysRemaining <= 0) return 0

  const expectedSoFar = (expectedTotal / 7) * daysElapsed
  const delta = actualTotal - expectedSoFar
  const perDayAdjustment = -delta / daysRemaining

  const rounded = Math.round(perDayAdjustment)
  // Convert -0 to +0 to avoid Object.is() equality issues
  return rounded === 0 ? 0 : rounded
}
