/**
 * Google Provider Adapter (Gemini models)
 */

import type { LLMProvider, ProviderResponse } from './base'
import { generatePrompt, validateResponse } from './base'

// https://ai.google.dev/pricing (as of Jan 2025)
// Pricing varies by model - using conservative estimates
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
  'gemini-2.5-flash': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  'gemini-2.5-flash-lite': { input: 0.075 / 1_000_000, output: 0.30 / 1_000_000 },
}

export class GoogleProvider implements LLMProvider {
  name: string
  model: string
  costPerInputToken: number
  costPerOutputToken: number

  private apiKey: string

  constructor(model: string = 'gemini-2.0-flash', apiKey?: string) {
    this.model = model
    this.name = `Google-${model}`
    this.apiKey = apiKey ?? process.env.GOOGLE_API_KEY ?? ''

    const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['gemini-2.0-flash']
    this.costPerInputToken = pricing.input
    this.costPerOutputToken = pricing.output

    if (!this.apiKey) {
      throw new Error('Google API key not found. Set GOOGLE_API_KEY environment variable.')
    }
  }

  async estimate(description: string): Promise<ProviderResponse> {
    const prompt = generatePrompt(description)
    const startTime = Date.now()

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${prompt}\n\nRespond with valid JSON only, no markdown formatting or code blocks.`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json'
          }
        }),
      })

      const latencyMs = Date.now() - startTime

      if (!response.ok) {
        const error = await response.text()
        return {
          items: [],
          latencyMs,
          inputTokens: 0,
          outputTokens: 0,
          error: `Google API error: ${error}`
        }
      }

      const data = await response.json()

      // Extract text content from Google response
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!textContent) {
        return {
          items: [],
          latencyMs,
          inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
          error: 'No text content in response'
        }
      }

      // Parse JSON from response (may be wrapped in code blocks)
      let jsonText = textContent.trim()
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      const parsed = JSON.parse(jsonText)
      const items = validateResponse(parsed)

      return {
        items,
        latencyMs,
        inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      }
    } catch (error) {
      return {
        items: [],
        latencyMs: Date.now() - startTime,
        inputTokens: 0,
        outputTokens: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}
