/**
 * LLM Provider Benchmark Types
 */

export type MealUnit = 'portion' | 'g' | 'ml' | 'spoon' | 'piece' | 'cup'

export interface MacroRange {
  min: number
  max: number
}

export interface ExpectedItem {
  name: string
  quantity: number
  unit: MealUnit
  calories: MacroRange
  protein_g: MacroRange
  carbs_g: MacroRange
  fat_g: MacroRange
  alcohol_g?: number
}

export interface TestCase {
  id: string
  description: string
  category: 'simple' | 'multi-item' | 'spanish' | 'vague' | 'quantity' | 'alcohol'
  expected: {
    items: ExpectedItem[]
  }
}

export interface EstimatedItem {
  name: string
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
}

export interface ProviderResponse {
  items: EstimatedItem[]
  latencyMs: number
  inputTokens: number
  outputTokens: number
  error?: string
}

export interface LLMProvider {
  name: string
  model: string
  costPerInputToken: number
  costPerOutputToken: number
  estimate(description: string): Promise<ProviderResponse>
}

export interface TestResult {
  testCaseId: string
  description: string
  category: string
  provider: string
  model: string
  latencyMs: number
  inputTokens: number
  outputTokens: number
  cost: number
  expectedItems: ExpectedItem[]
  actualItems: EstimatedItem[]
  metrics: {
    itemCountMatch: boolean
    caloriesMAPE: number
    proteinMAPE: number
    carbsMAPE: number
    fatMAPE: number
    overallMAPE: number
  }
  error?: string
}

export interface ProviderSummary {
  provider: string
  model: string
  totalTests: number
  successfulTests: number
  avgLatencyMs: number
  avgCaloriesMAPE: number
  avgProteinMAPE: number
  avgCarbsMAPE: number
  avgFatMAPE: number
  avgOverallMAPE: number
  totalCost: number
  costPer1000Calls: number
  itemCountAccuracy: number
}

export interface BenchmarkResults {
  timestamp: string
  testCases: number
  providers: string[]
  results: TestResult[]
  summaries: ProviderSummary[]
}
