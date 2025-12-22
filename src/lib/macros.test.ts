import { describe, it, expect } from 'vitest'
import { calculateExpectedMacros, resolveValue, calculateMealMacros, calculateWeeklyRebalance } from './macros'
import type { UserSettings, MealEntry } from '../types'

describe('calculateExpectedMacros', () => {
  it('should calculate expected macros from user settings', () => {
    const settings: UserSettings = {
      user_id: 'test-user',
      daily_calories_target: 2000,
      protein_pct: 30,
      carbs_pct: 40,
      fat_pct: 30,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }

    const expected = calculateExpectedMacros(settings)

    // Protein: (2000 * 0.30) / 4 = 150g
    expect(expected.protein_g).toBe(150)
    // Carbs: (2000 * 0.40) / 4 = 200g
    expect(expected.carbs_g).toBe(200)
    // Fat: (2000 * 0.30) / 9 = 66.67g
    expect(expected.fat_g).toBeCloseTo(66.67, 2)
    expect(expected.calories).toBe(2000)
  })

  it('should handle different macro splits', () => {
    const settings: UserSettings = {
      user_id: 'test-user',
      daily_calories_target: 2500,
      protein_pct: 25,
      carbs_pct: 50,
      fat_pct: 25,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }

    const expected = calculateExpectedMacros(settings)

    expect(expected.protein_g).toBe(156.25) // (2500 * 0.25) / 4
    expect(expected.carbs_g).toBe(312.5)    // (2500 * 0.50) / 4
    expect(expected.fat_g).toBeCloseTo(69.44, 2) // (2500 * 0.25) / 9
  })
})

describe('resolveValue', () => {
  it('should return min for light portion', () => {
    expect(resolveValue(100, 200, 'light')).toBe(100)
  })

  it('should return max for heavy portion', () => {
    expect(resolveValue(100, 200, 'heavy')).toBe(200)
  })

  it('should return average for ok portion', () => {
    expect(resolveValue(100, 200, 'ok')).toBe(150)
  })

  it('should handle decimal values correctly', () => {
    expect(resolveValue(50.5, 100.5, 'ok')).toBe(75.5)
  })
})

describe('calculateMealMacros', () => {
  it('should calculate macros for a meal with ok portion', () => {
    const meal: MealEntry = {
      id: 'test-meal',
      user_id: 'test-user',
      date_local: '2024-01-01',
      meal_group: 'breakfast',
      position: 0,
      description: 'Test meal',
      calories_min: 200,
      calories_max: 300,
      protein_g_min: 20,
      protein_g_max: 30,
      carbs_g_min: 25,
      carbs_g_max: 35,
      fat_g_min: 8,
      fat_g_max: 12,
      alcohol_g: 0,
      alcohol_calories: 0,
      uncertainty: false,
      portion_level: 'ok',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      last_estimated_at: '2024-01-01'
    }

    const macros = calculateMealMacros(meal)

    expect(macros.calories).toBe(250) // (200 + 300) / 2
    expect(macros.protein_g).toBe(25)  // (20 + 30) / 2
    expect(macros.carbs_g).toBe(30)    // (25 + 35) / 2
    expect(macros.fat_g).toBe(10)      // (8 + 12) / 2
  })

  it('should add alcohol calories to total calories', () => {
    const meal: MealEntry = {
      id: 'test-meal',
      user_id: 'test-user',
      date_local: '2024-01-01',
      meal_group: 'dinner',
      position: 0,
      description: 'Beer',
      calories_min: 10,
      calories_max: 14,
      protein_g_min: 0,
      protein_g_max: 0,
      carbs_g_min: 3,
      carbs_g_max: 3,
      fat_g_min: 0,
      fat_g_max: 0,
      alcohol_g: 12,
      alcohol_calories: 84, // 12 * 7
      uncertainty: false,
      portion_level: 'ok',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      last_estimated_at: '2024-01-01'
    }

    const macros = calculateMealMacros(meal)

    expect(macros.calories).toBe(96) // 12 (food) + 84 (alcohol)
    expect(macros.carbs_g).toBe(3)
  })

  it('should use min values for light portion', () => {
    const meal: MealEntry = {
      id: 'test-meal',
      user_id: 'test-user',
      date_local: '2024-01-01',
      meal_group: 'lunch',
      position: 0,
      description: 'Salad',
      calories_min: 150,
      calories_max: 250,
      protein_g_min: 10,
      protein_g_max: 20,
      carbs_g_min: 15,
      carbs_g_max: 25,
      fat_g_min: 5,
      fat_g_max: 10,
      alcohol_g: 0,
      alcohol_calories: 0,
      uncertainty: false,
      portion_level: 'light',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      last_estimated_at: '2024-01-01'
    }

    const macros = calculateMealMacros(meal)

    expect(macros.calories).toBe(150)
    expect(macros.protein_g).toBe(10)
    expect(macros.carbs_g).toBe(15)
    expect(macros.fat_g).toBe(5)
  })
})

describe('calculateWeeklyRebalance', () => {
  it('should calculate positive rebalance when under target', () => {
    const actualTotal = 10000  // ate 10k calories
    const expectedTotal = 14000 // weekly target
    const daysElapsed = 4       // Mon-Thu
    const daysRemaining = 3     // Fri-Sun

    const rebalance = calculateWeeklyRebalance(actualTotal, expectedTotal, daysElapsed, daysRemaining)

    // Expected so far: (14000 / 7) * 4 = 8000
    // Delta: 10000 - 8000 = +2000 (over by 2000)
    // Rebalance: -2000 / 3 = -667 cal/day
    expect(rebalance).toBe(-667)
  })

  it('should calculate negative rebalance when over target', () => {
    const actualTotal = 6000   // ate 6k calories
    const expectedTotal = 14000 // weekly target
    const daysElapsed = 4       // Mon-Thu
    const daysRemaining = 3     // Fri-Sun

    const rebalance = calculateWeeklyRebalance(actualTotal, expectedTotal, daysElapsed, daysRemaining)

    // Expected so far: (14000 / 7) * 4 = 8000
    // Delta: 6000 - 8000 = -2000 (under by 2000)
    // Rebalance: +2000 / 3 = +667 cal/day
    expect(rebalance).toBe(667)
  })

  it('should return 0 when no days remaining', () => {
    const rebalance = calculateWeeklyRebalance(14000, 14000, 7, 0)
    expect(rebalance).toBe(0)
  })

  it('should return 0 when perfectly on track', () => {
    const actualTotal = 8000
    const expectedTotal = 14000
    const daysElapsed = 4
    const daysRemaining = 3

    const rebalance = calculateWeeklyRebalance(actualTotal, expectedTotal, daysElapsed, daysRemaining)
    expect(rebalance).toBe(0)
  })

  it('should round to nearest integer', () => {
    const actualTotal = 8333
    const expectedTotal = 14000
    const daysElapsed = 4
    const daysRemaining = 3

    const rebalance = calculateWeeklyRebalance(actualTotal, expectedTotal, daysElapsed, daysRemaining)

    // Expected so far: 8000
    // Delta: 8333 - 8000 = +333
    // Rebalance: -333 / 3 = -111
    expect(rebalance).toBe(-111)
  })
})
