import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY')

interface SearchRequest {
  query: string
  limit?: number
}

interface SimilarMeal {
  id: string
  description: string
  quantity: number
  unit: string
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
  base_calories_min: number | null
  base_calories_max: number | null
  base_protein_g_min: number | null
  base_protein_g_max: number | null
  base_carbs_g_min: number | null
  base_carbs_g_max: number | null
  base_fat_g_min: number | null
  base_fat_g_max: number | null
  base_alcohol_g: number | null
  base_alcohol_calories: number | null
  uncertainty: boolean
  date_local: string
  similarity: number
  adjusted_similarity?: number
  original_similarity?: number
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  const log = (level: string, message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      level,
      function: 'search_similar_meals',
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Parse request
    const { query, limit = 5 }: SearchRequest = await req.json()

    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify([]), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    log('info', 'Searching similar meals', { query, limit })

    // Generate embedding for query using Google's API
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
            parts: [{ text: query.trim() }]
          }
        }),
      }
    )

    const embeddingLatencyMs = Date.now() - startTime

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text()
      log('error', 'Google embedding API error', {
        status: embeddingResponse.status,
        error,
        latencyMs: embeddingLatencyMs
      })
      throw new Error(`Failed to generate embedding: ${error}`)
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.embedding?.values

    if (!queryEmbedding) {
      log('error', 'No embedding in response', { embeddingData })
      throw new Error('No embedding in response')
    }

    log('info', 'Query embedding generated', { latencyMs: embeddingLatencyMs })

    // Search similar meals using pgvector
    const searchStartTime = Date.now()
    const { data: results, error } = await supabaseClient.rpc('search_similar_meals_vector', {
      query_embedding: queryEmbedding,
      match_limit: limit * 2, // Fetch more for recency filtering
    })

    const searchLatencyMs = Date.now() - searchStartTime

    if (error) {
      log('error', 'Database search failed', { error: error.message })
      throw error
    }

    log('info', 'Database search complete', { searchLatencyMs, resultCount: results?.length ?? 0 })

    // Apply recency bias: prioritize recent meals
    const now = new Date()
    const scoredResults = (results || []).map((meal: SimilarMeal) => {
      const mealDate = new Date(meal.date_local)
      const daysSince = Math.floor(
        (now.getTime() - mealDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      // Decay factor: 0.99^days (1% decay per day)
      const recencyFactor = Math.pow(0.99, daysSince)
      const adjustedSimilarity = meal.similarity * (0.7 + 0.3 * recencyFactor)

      return {
        ...meal,
        original_similarity: meal.similarity,
        adjusted_similarity: adjustedSimilarity,
        similarity: adjustedSimilarity // Override with adjusted value
      }
    })

    // Sort by adjusted similarity and return top N
    const topResults = scoredResults
      .sort((a, b) => b.adjusted_similarity - a.adjusted_similarity)
      .slice(0, limit)

    log('info', 'Search complete', { returnedCount: topResults.length })

    return new Response(
      JSON.stringify(topResults),
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
