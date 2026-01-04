import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY')

interface UpdateEmbeddingRequest {
  meal_entry_id: string
  description: string
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  const log = (level: string, message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      level,
      function: 'update_meal_embedding',
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

    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      log('error', 'Missing authorization header')
      throw new Error('Missing authorization header')
    }

    // Create client with service role key for insert operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Parse request
    const { meal_entry_id, description }: UpdateEmbeddingRequest = await req.json()

    if (!meal_entry_id || !description) {
      throw new Error('meal_entry_id and description required')
    }

    // Verify the meal entry belongs to the user
    const { data: mealEntry, error: verifyError } = await supabaseClient
      .from('meal_entries')
      .select('id, user_id')
      .eq('id', meal_entry_id)
      .single()

    if (verifyError || !mealEntry) {
      throw new Error('Meal entry not found')
    }

    if (mealEntry.user_id !== user.id) {
      throw new Error('Unauthorized: meal entry does not belong to user')
    }

    log('info', 'Generating embedding', { meal_entry_id, descriptionLength: description.length })

    // Generate embedding using Google's API
    const startTime = Date.now()
    const embeddingResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: {
            parts: [{ text: description.trim() }]
          }
        }),
      }
    )

    const latencyMs = Date.now() - startTime

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text()
      log('error', 'Google embedding API error', {
        status: embeddingResponse.status,
        error,
        latencyMs
      })
      throw new Error(`Failed to generate embedding: ${error}`)
    }

    const embeddingData = await embeddingResponse.json()
    const embedding = embeddingData.embedding?.values

    if (!embedding) {
      log('error', 'No embedding in response', { embeddingData })
      throw new Error('No embedding in response')
    }

    log('info', 'Embedding generated', { latencyMs, dimensions: embedding.length })

    // Upsert embedding
    const { error } = await supabaseClient
      .from('meal_embeddings')
      .upsert({
        meal_entry_id,
        user_id: user.id,
        embedding,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'meal_entry_id'
      })

    if (error) {
      log('error', 'Database upsert failed', { error: error.message })
      throw error
    }

    log('info', 'Embedding saved successfully', { meal_entry_id })

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    log('error', 'Request failed', { error: error.message, stack: error.stack })
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
