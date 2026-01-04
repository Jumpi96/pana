import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_MODEL = 'gemini-2.5-flash-lite'

interface EstimateRequest {
  description: string
}

type MealUnit = 'portion' | 'g' | 'ml' | 'spoon' | 'piece' | 'cup'

interface EstimatedItem {
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
  // Base macros (per 1 unit)
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

interface EstimateResponse {
  items: EstimatedItem[]
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  const log = (level: string, message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      level,
      function: 'estimate_meal',
      message,
      ...data
    }))
  }

  try {
    // CORS handling
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      })
    }

    // Authentication check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      log('error', 'Missing authorization header')
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    // Parse request
    const { description }: EstimateRequest = await req.json()

    if (!description || description.length === 0 || description.length > 140) {
      log('error', 'Invalid description length', { length: description?.length })
      throw new Error('Description must be 1-140 characters')
    }

    log('info', 'Processing meal estimation', { description })

    // Build prompt for Gemini
    const prompt = `You are a nutrition expert. Analyze this meal description and extract individual food items with quantities: "${description}".

## TASK 1 - ITEM DETECTION
Split the description into separate food items:
- "Dos presas de pollo, un poco de ensalada" → 2 items: pollo and ensalada
- "Crackers con queso" → 2 items: crackers and queso
- "50g crackers" → 1 item
- Single item descriptions → return array with 1 item

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
- Preserve important context as context_note:
  - "galleta de arroz instead of bread" → name: "Galleta de arroz", context_note: "instead of bread"
  - "pollo sin piel" → name: "Pollo sin piel", context_note: null (modifier is part of the food)
  - "2 sanguches (pero con galleta de arroz)" → name: "Sanguches con galleta de arroz", context_note: null

## TASK 4 - MACRO CALCULATION
For each item provide TWO sets of macros:

A) CURRENT MACROS - for the SPECIFIED quantity:
   - calories_min/max, protein_g_min/max, carbs_g_min/max, fat_g_min/max
   - alcohol_g, alcohol_calories (7 cal/g, NOT included in calories_min/max)

B) BASE MACROS - per 1 UNIT (for recalculation when user changes quantity):
   - base_calories_min/max, base_protein_g_min/max, etc.
   - If quantity is 50g, base macros are per 1g
   - If quantity is 2 pieces, base macros are per 1 piece

CALORIE FORMULA: calories = (protein_g * 4) + (carbs_g * 4) + (fat_g * 9)
DO NOT include alcohol in calories_min/max!

Example: "50g crackers" (roughly 200 cal for 50g)
- quantity: 50, unit: "g"
- calories_min: 190, calories_max: 210 (for 50g)
- base_calories_min: 3.8, base_calories_max: 4.2 (per 1g)

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
      "normalized_name": "Food Name",
      "quantity": 1,
      "unit": "portion",
      "context_note": null,
      "calories_min": 0, "calories_max": 0,
      "protein_g_min": 0, "protein_g_max": 0,
      "carbs_g_min": 0, "carbs_g_max": 0,
      "fat_g_min": 0, "fat_g_max": 0,
      "alcohol_g": 0, "alcohol_calories": 0,
      "uncertainty": false,
      "base_calories_min": 0, "base_calories_max": 0,
      "base_protein_g_min": 0, "base_protein_g_max": 0,
      "base_carbs_g_min": 0, "base_carbs_g_max": 0,
      "base_fat_g_min": 0, "base_fat_g_max": 0,
      "base_alcohol_g": 0, "base_alcohol_calories": 0
    }
  ]
}`

    // Call Google Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_API_KEY}`

    log('info', 'Calling Gemini API', { model: GEMINI_MODEL })
    const startTime = Date.now()

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      }),
    })

    const latencyMs = Date.now() - startTime

    if (!geminiResponse.ok) {
      const error = await geminiResponse.text()
      log('error', 'Gemini API error', {
        status: geminiResponse.status,
        statusText: geminiResponse.statusText,
        error,
        latencyMs
      })
      throw new Error(`Gemini API error: ${error}`)
    }

    const geminiData = await geminiResponse.json()
    log('info', 'Gemini API response received', { latencyMs })

    // Extract text content from Gemini response
    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textContent) {
      log('error', 'No content in Gemini response', {
        candidates: geminiData.candidates?.length,
        finishReason: geminiData.candidates?.[0]?.finishReason,
        promptFeedback: geminiData.promptFeedback
      })
      throw new Error('No content in Gemini response')
    }

    // Parse JSON response
    let jsonText = textContent.trim()
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let response: EstimateResponse
    try {
      response = JSON.parse(jsonText)
    } catch (parseError) {
      log('error', 'Failed to parse Gemini response as JSON', {
        rawResponse: textContent.substring(0, 500),
        parseError: String(parseError)
      })
      throw new Error('Failed to parse nutrition response')
    }

    // Validate response structure
    if (!response.items || !Array.isArray(response.items) || response.items.length === 0) {
      log('error', 'Invalid response structure', { response })
      throw new Error('Invalid response: expected items array')
    }

    log('info', 'Validating items', { itemCount: response.items.length })

    const validUnits = ['portion', 'g', 'ml', 'spoon', 'piece', 'cup']

    // Validate and reconcile each item
    for (const item of response.items) {
      // Validate required fields
      if (
        typeof item.normalized_name !== 'string' ||
        item.normalized_name.length === 0 ||
        typeof item.quantity !== 'number' ||
        item.quantity <= 0 ||
        typeof item.unit !== 'string' ||
        !validUnits.includes(item.unit)
      ) {
        log('error', 'Invalid item structure', { item })
        throw new Error(`Invalid item structure: ${JSON.stringify(item)}`)
      }

      // Validate macro fields
      if (
        typeof item.calories_min !== 'number' ||
        typeof item.calories_max !== 'number' ||
        item.calories_min < 0 ||
        item.calories_max < item.calories_min ||
        typeof item.protein_g_min !== 'number' ||
        typeof item.protein_g_max !== 'number' ||
        item.protein_g_min < 0 ||
        item.protein_g_max < item.protein_g_min ||
        typeof item.carbs_g_min !== 'number' ||
        typeof item.carbs_g_max !== 'number' ||
        item.carbs_g_min < 0 ||
        item.carbs_g_max < item.carbs_g_min ||
        typeof item.fat_g_min !== 'number' ||
        typeof item.fat_g_max !== 'number' ||
        item.fat_g_min < 0 ||
        item.fat_g_max < item.fat_g_min ||
        typeof item.alcohol_g !== 'number' ||
        item.alcohol_g < 0 ||
        typeof item.alcohol_calories !== 'number' ||
        item.alcohol_calories < 0 ||
        typeof item.uncertainty !== 'boolean'
      ) {
        throw new Error(`Invalid macro values for item: ${item.normalized_name}`)
      }

      // Validate base macro fields
      if (
        typeof item.base_calories_min !== 'number' ||
        typeof item.base_calories_max !== 'number' ||
        item.base_calories_min < 0 ||
        typeof item.base_protein_g_min !== 'number' ||
        typeof item.base_protein_g_max !== 'number' ||
        item.base_protein_g_min < 0 ||
        typeof item.base_carbs_g_min !== 'number' ||
        typeof item.base_carbs_g_max !== 'number' ||
        item.base_carbs_g_min < 0 ||
        typeof item.base_fat_g_min !== 'number' ||
        typeof item.base_fat_g_max !== 'number' ||
        item.base_fat_g_min < 0 ||
        typeof item.base_alcohol_g !== 'number' ||
        item.base_alcohol_g < 0 ||
        typeof item.base_alcohol_calories !== 'number' ||
        item.base_alcohol_calories < 0
      ) {
        throw new Error(`Invalid base macro values for item: ${item.normalized_name}`)
      }

      // Reconcile calories with macros for current values
      const expectedFoodMin = (item.protein_g_min * 4) + (item.carbs_g_min * 4) + (item.fat_g_min * 9)
      const expectedFoodMax = (item.protein_g_max * 4) + (item.carbs_g_max * 4) + (item.fat_g_max * 9)
      const expectedAlcoholCals = Math.round(item.alcohol_g * 7)

      // Define tolerance for validation (50% OR 15 cals)
      const toleranceMin = Math.max(expectedFoodMin * 0.5, 15)
      const toleranceMax = Math.max(expectedFoodMax * 0.5, 15)
      const alcoholTolerance = Math.max(expectedAlcoholCals * 0.5, 10)

      const diffFoodMin = Math.abs(item.calories_min - expectedFoodMin)
      const diffFoodMax = Math.abs(item.calories_max - expectedFoodMax)
      const diffAlcohol = Math.abs(item.alcohol_calories - expectedAlcoholCals)

      // If Gemini's calories are reasonably close, overwrite with calculated values
      if (diffFoodMin <= toleranceMin && diffFoodMax <= toleranceMax && diffAlcohol <= alcoholTolerance) {
        item.calories_min = Math.round(expectedFoodMin)
        item.calories_max = Math.round(expectedFoodMax)
        item.alcohol_calories = expectedAlcoholCals
      } else {
        log('error', 'Significant calorie mismatch detected', {
          itemName: item.normalized_name,
          estimate: { calories_min: item.calories_min, calories_max: item.calories_max },
          expected: { foodMin: expectedFoodMin, foodMax: expectedFoodMax, alcoholCals: expectedAlcoholCals },
          macros: {
            protein: { min: item.protein_g_min, max: item.protein_g_max },
            carbs: { min: item.carbs_g_min, max: item.carbs_g_max },
            fat: { min: item.fat_g_min, max: item.fat_g_max }
          }
        })
        throw new Error(`Could not generate consistent nutrition for "${item.normalized_name}". Please try a more specific description.`)
      }

      // Reconcile base calories with base macros
      const expectedBaseFoodMin = (item.base_protein_g_min * 4) + (item.base_carbs_g_min * 4) + (item.base_fat_g_min * 9)
      const expectedBaseFoodMax = (item.base_protein_g_max * 4) + (item.base_carbs_g_max * 4) + (item.base_fat_g_max * 9)
      const expectedBaseAlcoholCals = Math.round(item.base_alcohol_g * 7)

      item.base_calories_min = Math.round(expectedBaseFoodMin * 100) / 100
      item.base_calories_max = Math.round(expectedBaseFoodMax * 100) / 100
      item.base_alcohol_calories = Math.round(expectedBaseAlcoholCals * 100) / 100

      // Ensure context_note is null or string
      if (item.context_note !== null && typeof item.context_note !== 'string') {
        item.context_note = null
      }
    }

    log('info', 'Estimation successful', {
      itemCount: response.items.length,
      items: response.items.map(i => ({ name: i.normalized_name, quantity: i.quantity, unit: i.unit }))
    })

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    log('error', 'Request failed', {
      error: error.message,
      stack: error.stack
    })
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
