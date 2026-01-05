/**
 * Base Provider Interface and Shared Utilities
 */

import type { LLMProvider, EstimatedItem, ProviderResponse } from '../types'

export type { LLMProvider, ProviderResponse }

/**
 * Generate the meal estimation prompt for a given description
 */
export function generatePrompt(description: string): string {
  return `You are a nutrition expert. Analyze this meal description and extract individual food items with quantities: "${description}".

## TASK 1 - ITEM DETECTION
Determine if description contains MULTIPLE SEPARATE foods or ONE compound food:

SPLIT into multiple items ONLY when:
- Comma-separated distinct foods: "Dos presas de pollo, un poco de ensalada" → 2 items
- "y"/"and" connecting different foods: "huevos y tocino" → 2 items
- Clearly separate accompaniments: "arroz con pollo y ensalada" → 3 items

DO NOT SPLIT (keep as ONE item):
- Food with topping/spread: "2 tostadas con mermelada" → 1 item (toast with jam, qty 2)
- Prepared dishes: "sandwich de jamón" → 1 item
- Food with sauce/dressing: "ensalada con aderezo" → 1 item
- Compound names: "huevos revueltos" → 1 item

The key: if "con/with" describes HOW the food is prepared/served, it's ONE item.
If items could be eaten separately, they are MULTIPLE items.

## TASK 2 - QUANTITY EXTRACTION
Extract explicit quantities and convert to standard units:
- "50g crackers" → quantity: 50, unit: "g"
- "Una cucharada de miel" / "1 spoon of honey" → quantity: 1, unit: "spoon"
- "2 huevos" / "two eggs" → quantity: 2, unit: "piece"
- "Un vaso de leche" / "a glass of milk" → quantity: 250, unit: "ml"
- "Una copa de vino" / "a glass of wine" → quantity: 1, unit: "portion" (standard serving)
- "Dos presas de pollo" → quantity: 2, unit: "piece"
- "Un poco de ensalada" → quantity: 1, unit: "portion" (small/light portion)
- No explicit quantity → quantity: 1, unit: "portion"

SUPPORTED UNITS (use these exact English values):
- "portion" - default for undefined amounts or servings
- "g" - grams
- "ml" - milliliters
- "spoon" - tablespoon/cucharada
- "piece" - individual countable items (eggs, fruits, chicken pieces)
- "cup" - cups/tazas

## TASK 3 - NAME NORMALIZATION
- Keep food name in the ORIGINAL language of the description
- Capitalize first letter only
- Remove quantity/unit from name: "50g crackers" → "Crackers"
- Remove leading articles: "una manzana" → "Manzana"

## TASK 4 - MACRO CALCULATION
For each item provide macros for the SPECIFIED quantity:
- calories_min/max, protein_g_min/max, carbs_g_min/max, fat_g_min/max
- alcohol_g, alcohol_calories (7 cal/g, NOT included in calories_min/max)

CALORIE FORMULA: calories = (protein_g * 4) + (carbs_g * 4) + (fat_g * 9)
DO NOT include alcohol in calories_min/max!

## UNCERTAINTY
- uncertainty=false: Specific quantities or named foods ("2 eggs", "chicken breast")
- uncertainty=true: Very vague descriptions ("pasta", "salad", "snack")

## RANGE SIZING
- Specific meals: ±20% ranges
- Less specific meals: ±40% ranges

Return JSON:
{
  "items": [
    {
      "name": "Food Name",
      "quantity": 1,
      "unit": "portion",
      "calories_min": 0, "calories_max": 0,
      "protein_g_min": 0, "protein_g_max": 0,
      "carbs_g_min": 0, "carbs_g_max": 0,
      "fat_g_min": 0, "fat_g_max": 0,
      "alcohol_g": 0, "alcohol_calories": 0,
      "uncertainty": false
    }
  ]
}`
}

/**
 * Validate and normalize a provider response
 */
export function validateResponse(data: unknown): EstimatedItem[] {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response: not an object')
  }

  const response = data as Record<string, unknown>
  if (!response.items || !Array.isArray(response.items)) {
    throw new Error('Invalid response: missing items array')
  }

  if (response.items.length === 0) {
    throw new Error('Invalid response: empty items array')
  }

  const validUnits = ['portion', 'g', 'ml', 'spoon', 'piece', 'cup']
  const items: EstimatedItem[] = []

  for (const item of response.items) {
    if (typeof item !== 'object' || item === null) {
      throw new Error('Invalid item: not an object')
    }

    const i = item as Record<string, unknown>

    // Normalize field names (some providers might use normalized_name)
    const name = (i.name ?? i.normalized_name) as string
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('Invalid item: missing or empty name')
    }

    const quantity = Number(i.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error(`Invalid item: invalid quantity for ${name}`)
    }

    const unit = String(i.unit)
    if (!validUnits.includes(unit)) {
      throw new Error(`Invalid item: invalid unit "${unit}" for ${name}`)
    }

    const validatedItem: EstimatedItem = {
      name,
      quantity,
      unit: unit as EstimatedItem['unit'],
      calories_min: Number(i.calories_min) || 0,
      calories_max: Number(i.calories_max) || 0,
      protein_g_min: Number(i.protein_g_min) || 0,
      protein_g_max: Number(i.protein_g_max) || 0,
      carbs_g_min: Number(i.carbs_g_min) || 0,
      carbs_g_max: Number(i.carbs_g_max) || 0,
      fat_g_min: Number(i.fat_g_min) || 0,
      fat_g_max: Number(i.fat_g_max) || 0,
      alcohol_g: Number(i.alcohol_g) || 0,
      alcohol_calories: Number(i.alcohol_calories) || 0,
    }

    items.push(validatedItem)
  }

  return items
}
