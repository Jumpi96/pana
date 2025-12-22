import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

interface EstimateRequest {
  description: string
}

interface EstimateResponse {
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

serve(async (req) => {
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
      throw new Error('Description must be 1-140 characters')
    }

    // Call OpenAI API
    const prompt = `You are a nutrition expert. Estimate the macronutrients for this meal: "${description}".

IMPORTANT - Calorie Calculation Rules:
- calories_min/max should ONLY include food macros (protein + carbs + fat)
- Formula: calories = (protein_g * 4) + (carbs_g * 4) + (fat_g * 9)
- alcohol_g and alcohol_calories (7 cal/g) MUST be provided separately
- DO NOT include alcohol in calories_min/max

Example for "light beer (95 kcal)":
- Macros: 0g protein, 3g carbs, 0g fat
- calories_min/max: 12 (from 3g carbs * 4)
- alcohol_g: 12
- alcohol_calories: 84 (from 12g * 7)
- Total: 12 + 84 = 96 cal

Provide RANGES (minimum and maximum) for protein, carbs, fat, and food calories.
Ensure they are mathematically consistent.

UNCERTAINTY GUIDELINES - Only set uncertainty=true when the description is VERY vague:
- ✅ CERTAIN (uncertainty=false): Specific quantities + named foods, even if homemade
  Examples: "2 eggs", "chicken breast with rice", "2 tostadas con jalea", "bowl of oatmeal with banana"
- ❌ UNCERTAIN (uncertainty=true): Generic descriptions without specifics
  Examples: "pasta", "salad", "sandwich", "snack", "lunch"

If you can make a reasonable estimate with a normal range, set uncertainty=false.

Return JSON in this exact format:
{
  "calories_min": <number>,
  "calories_max": <number>,
  "protein_g_min": <number>,
  "protein_g_max": <number>,
  "carbs_g_min": <number>,
  "carbs_g_max": <number>,
  "fat_g_min": <number>,
  "fat_g_max": <number>,
  "alcohol_g": <number>,
  "alcohol_calories": <number>,
  "uncertainty": <boolean>
}

Range sizing: Use tighter ranges for specific meals (±20%), wider ranges for less specific meals (±40%).`

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful nutrition expert. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const openaiData = await openaiResponse.json()
    const content = openaiData.choices[0].message.content
    const estimate: EstimateResponse = JSON.parse(content)

    // Validate response
    if (
      typeof estimate.calories_min !== 'number' ||
      typeof estimate.calories_max !== 'number' ||
      estimate.calories_min < 0 ||
      estimate.calories_max < estimate.calories_min ||
      typeof estimate.protein_g_min !== 'number' ||
      typeof estimate.protein_g_max !== 'number' ||
      estimate.protein_g_min < 0 ||
      estimate.protein_g_max < estimate.protein_g_min ||
      typeof estimate.carbs_g_min !== 'number' ||
      typeof estimate.carbs_g_max !== 'number' ||
      estimate.carbs_g_min < 0 ||
      estimate.carbs_g_max < estimate.carbs_g_min ||
      typeof estimate.fat_g_min !== 'number' ||
      typeof estimate.fat_g_max !== 'number' ||
      estimate.fat_g_min < 0 ||
      estimate.fat_g_max < estimate.fat_g_min ||
      typeof estimate.alcohol_g !== 'number' ||
      estimate.alcohol_g < 0 ||
      typeof estimate.alcohol_calories !== 'number' ||
      estimate.alcohol_calories < 0 ||
      typeof estimate.uncertainty !== 'boolean'
    ) {
      throw new Error('Invalid estimation response from OpenAI')
    }

    // Reconcile calories with macros
    // We trust the macro grams (P/C/F) more and recalculate calories to ensure 100% mathematical consistency
    const expectedFoodMin = (estimate.protein_g_min * 4) + (estimate.carbs_g_min * 4) + (estimate.fat_g_min * 9)
    const expectedFoodMax = (estimate.protein_g_max * 4) + (estimate.carbs_g_max * 4) + (estimate.fat_g_max * 9)
    const expectedAlcoholCals = Math.round(estimate.alcohol_g * 7)

    // Define tolerance for validation (50% OR 15 cals)
    const toleranceMin = Math.max(expectedFoodMin * 0.5, 15)
    const toleranceMax = Math.max(expectedFoodMax * 0.5, 15)
    const alcoholTolerance = Math.max(expectedAlcoholCals * 0.5, 10)

    const diffFoodMin = Math.abs(estimate.calories_min - expectedFoodMin)
    const diffFoodMax = Math.abs(estimate.calories_max - expectedFoodMax)
    const diffAlcohol = Math.abs(estimate.alcohol_calories - expectedAlcoholCals)

    // If OpenAI's calories are reasonably close, we overwrite them with our perfectly calculated ones
    if (diffFoodMin <= toleranceMin && diffFoodMax <= toleranceMax && diffAlcohol <= alcoholTolerance) {
      estimate.calories_min = Math.round(expectedFoodMin)
      estimate.calories_max = Math.round(expectedFoodMax)
      estimate.alcohol_calories = expectedAlcoholCals
    } else {
      // Significant mismatch detected - log the raw response for debugging
      console.error('Significant calorie mismatch detected:', {
        estimate,
        expected: { foodMin: expectedFoodMin, foodMax: expectedFoodMax, alcoholCals: expectedAlcoholCals },
        differences: { foodMin: diffFoodMin, foodMax: diffFoodMax, alcohol: diffAlcohol }
      })
      throw new Error('Could not generate a consistent nutrition estimate. Please try a more specific description.')
    }

    return new Response(
      JSON.stringify(estimate),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('Error:', error)
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
