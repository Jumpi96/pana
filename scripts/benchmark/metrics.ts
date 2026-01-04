/**
 * Metrics Calculation for Benchmark
 *
 * Uses Mean Absolute Percentage Error (MAPE) to compare estimated vs expected macros.
 * Lower MAPE = more accurate predictions.
 */

import type { ExpectedItem, EstimatedItem, TestResult, TestCase, ProviderSummary } from './types'

/**
 * Calculate percentage error between actual and expected values.
 * For ranges, we use the midpoint of both ranges.
 */
function percentageError(actualMin: number, actualMax: number, expectedMin: number, expectedMax: number): number {
  const actualMid = (actualMin + actualMax) / 2
  const expectedMid = (expectedMin + expectedMax) / 2

  // Avoid division by zero
  if (expectedMid === 0) {
    return actualMid === 0 ? 0 : 100
  }

  return Math.abs((actualMid - expectedMid) / expectedMid) * 100
}

/**
 * Calculate Mean Absolute Percentage Error for a set of items.
 * If item counts don't match, we do our best to compare matching items.
 */
export function calculateItemMetrics(
  expectedItems: ExpectedItem[],
  actualItems: EstimatedItem[]
): {
  itemCountMatch: boolean
  caloriesMAPE: number
  proteinMAPE: number
  carbsMAPE: number
  fatMAPE: number
  overallMAPE: number
} {
  const itemCountMatch = expectedItems.length === actualItems.length

  if (actualItems.length === 0) {
    return {
      itemCountMatch: false,
      caloriesMAPE: 100,
      proteinMAPE: 100,
      carbsMAPE: 100,
      fatMAPE: 100,
      overallMAPE: 100,
    }
  }

  // Match items by order (simplest approach for benchmark)
  // In a real scenario, we might want to match by name similarity
  const numToCompare = Math.min(expectedItems.length, actualItems.length)

  let caloriesErrors: number[] = []
  let proteinErrors: number[] = []
  let carbsErrors: number[] = []
  let fatErrors: number[] = []

  for (let i = 0; i < numToCompare; i++) {
    const expected = expectedItems[i]
    const actual = actualItems[i]

    // For alcohol items, add alcohol_calories to the total
    const actualCalMin = actual.calories_min + actual.alcohol_calories
    const actualCalMax = actual.calories_max + actual.alcohol_calories

    const expectedCalMin = expected.calories.min + (expected.alcohol_g ?? 0) * 7
    const expectedCalMax = expected.calories.max + (expected.alcohol_g ?? 0) * 7

    caloriesErrors.push(percentageError(actualCalMin, actualCalMax, expectedCalMin, expectedCalMax))
    proteinErrors.push(percentageError(actual.protein_g_min, actual.protein_g_max, expected.protein_g.min, expected.protein_g.max))
    carbsErrors.push(percentageError(actual.carbs_g_min, actual.carbs_g_max, expected.carbs_g.min, expected.carbs_g.max))
    fatErrors.push(percentageError(actual.fat_g_min, actual.fat_g_max, expected.fat_g.min, expected.fat_g.max))
  }

  // Penalize for missing/extra items
  if (!itemCountMatch) {
    const diff = Math.abs(expectedItems.length - actualItems.length)
    for (let i = 0; i < diff; i++) {
      caloriesErrors.push(100)
      proteinErrors.push(100)
      carbsErrors.push(100)
      fatErrors.push(100)
    }
  }

  const caloriesMAPE = average(caloriesErrors)
  const proteinMAPE = average(proteinErrors)
  const carbsMAPE = average(carbsErrors)
  const fatMAPE = average(fatErrors)
  const overallMAPE = (caloriesMAPE + proteinMAPE + carbsMAPE + fatMAPE) / 4

  return {
    itemCountMatch,
    caloriesMAPE,
    proteinMAPE,
    carbsMAPE,
    fatMAPE,
    overallMAPE,
  }
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

/**
 * Calculate provider summary statistics from all test results
 */
export function calculateProviderSummary(
  provider: string,
  model: string,
  results: TestResult[],
  costPerInputToken: number,
  costPerOutputToken: number
): ProviderSummary {
  const providerResults = results.filter(r => r.provider === provider)
  const successfulResults = providerResults.filter(r => !r.error)

  const totalTests = providerResults.length
  const successfulTests = successfulResults.length

  const avgLatencyMs = successfulTests > 0
    ? average(successfulResults.map(r => r.latencyMs))
    : 0

  const avgCaloriesMAPE = successfulTests > 0
    ? average(successfulResults.map(r => r.metrics.caloriesMAPE))
    : 100

  const avgProteinMAPE = successfulTests > 0
    ? average(successfulResults.map(r => r.metrics.proteinMAPE))
    : 100

  const avgCarbsMAPE = successfulTests > 0
    ? average(successfulResults.map(r => r.metrics.carbsMAPE))
    : 100

  const avgFatMAPE = successfulTests > 0
    ? average(successfulResults.map(r => r.metrics.fatMAPE))
    : 100

  const avgOverallMAPE = successfulTests > 0
    ? average(successfulResults.map(r => r.metrics.overallMAPE))
    : 100

  const totalInputTokens = providerResults.reduce((sum, r) => sum + r.inputTokens, 0)
  const totalOutputTokens = providerResults.reduce((sum, r) => sum + r.outputTokens, 0)
  const totalCost = (totalInputTokens * costPerInputToken) + (totalOutputTokens * costPerOutputToken)
  const costPer1000Calls = totalTests > 0 ? (totalCost / totalTests) * 1000 : 0

  const itemCountMatches = successfulResults.filter(r => r.metrics.itemCountMatch).length
  const itemCountAccuracy = successfulTests > 0 ? (itemCountMatches / successfulTests) * 100 : 0

  return {
    provider,
    model,
    totalTests,
    successfulTests,
    avgLatencyMs: Math.round(avgLatencyMs),
    avgCaloriesMAPE: Math.round(avgCaloriesMAPE * 10) / 10,
    avgProteinMAPE: Math.round(avgProteinMAPE * 10) / 10,
    avgCarbsMAPE: Math.round(avgCarbsMAPE * 10) / 10,
    avgFatMAPE: Math.round(avgFatMAPE * 10) / 10,
    avgOverallMAPE: Math.round(avgOverallMAPE * 10) / 10,
    totalCost: Math.round(totalCost * 100000) / 100000, // 5 decimal places
    costPer1000Calls: Math.round(costPer1000Calls * 100) / 100,
    itemCountAccuracy: Math.round(itemCountAccuracy * 10) / 10,
  }
}
