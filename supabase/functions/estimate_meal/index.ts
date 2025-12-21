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

Provide RANGES (minimum and maximum) for calories, protein, carbs, and fat. If the meal contains alcohol, provide exact alcohol grams and alcohol calories (7 cal/g).

Return uncertainty=true if:
- The description is vague or ambiguous
- Portion size is unclear
- The meal is complex/homemade without details

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

Be conservative with ranges. For clear meals (e.g., "2 eggs"), keep ranges tight. For vague meals (e.g., "pasta"), use wider ranges.`

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
