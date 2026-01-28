import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const BATCH_SIZE = 50
const DELAY_MS = 100 // Rate limiting delay between API calls

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  const log = (level: string, message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      level,
      function: 'regenerate_embeddings',
      message,
      ...data
    }))
  }

  try {
    // CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      })
    }

    // Auth - require service role for this admin operation
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse optional user_id filter from request
    let userId: string | null = null
    try {
      const body = await req.json()
      userId = body.user_id || null
    } catch {
      // No body or invalid JSON, process all users
    }

    // Fetch all meal entries (optionally filtered by user)
    let query = supabaseClient
      .from('meal_entries')
      .select('id, user_id, description')
      .not('description', 'is', null)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: meals, error: fetchError } = await query

    if (fetchError) {
      throw new Error(`Failed to fetch meals: ${fetchError.message}`)
    }

    if (!meals || meals.length === 0) {
      return new Response(JSON.stringify({ message: 'No meals to process', processed: 0 }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    log('info', 'Starting embedding regeneration', { totalMeals: meals.length, userId })

    let processed = 0
    let failed = 0
    const errors: Array<{ meal_id: string; error: string }> = []

    // Process in batches
    for (let i = 0; i < meals.length; i += BATCH_SIZE) {
      const batch = meals.slice(i, i + BATCH_SIZE)

      for (const meal of batch) {
        try {
          // Generate embedding using Google's API
          const embeddingResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GOOGLE_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: { parts: [{ text: meal.description.trim() }] },
                outputDimensionality: 768
              }),
            }
          )

          if (!embeddingResponse.ok) {
            const error = await embeddingResponse.text()
            throw new Error(`API error: ${error}`)
          }

          const embeddingData = await embeddingResponse.json()
          const embedding = embeddingData.embedding?.values

          if (!embedding) {
            throw new Error('No embedding in response')
          }

          // Upsert embedding
          const { error: upsertError } = await supabaseClient
            .from('meal_embeddings')
            .upsert({
              meal_entry_id: meal.id,
              user_id: meal.user_id,
              embedding,
              updated_at: new Date().toISOString()
            }, { onConflict: 'meal_entry_id' })

          if (upsertError) {
            throw new Error(`DB error: ${upsertError.message}`)
          }

          processed++

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, DELAY_MS))

        } catch (error) {
          failed++
          errors.push({ meal_id: meal.id, error: error.message })
          log('error', 'Failed to process meal', { meal_id: meal.id, error: error.message })
        }
      }

      log('info', 'Batch progress', {
        processed,
        failed,
        remaining: meals.length - (i + batch.length)
      })
    }

    log('info', 'Embedding regeneration complete', { processed, failed })

    return new Response(
      JSON.stringify({
        message: 'Embedding regeneration complete',
        processed,
        failed,
        errors: errors.slice(0, 10) // Return first 10 errors
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )

  } catch (error) {
    log('error', 'Request failed', { error: error.message, stack: error.stack })
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  }
})
