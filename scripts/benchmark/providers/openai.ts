/**
 * OpenAI Provider Adapter (gpt-4o-mini)
 */

import type { LLMProvider, ProviderResponse } from './base'
import { generatePrompt, validateResponse } from './base'

// https://openai.com/api/pricing/ (as of Jan 2025)
const COST_PER_INPUT_TOKEN = 0.15 / 1_000_000   // $0.15 per 1M input tokens
const COST_PER_OUTPUT_TOKEN = 0.60 / 1_000_000  // $0.60 per 1M output tokens

export class OpenAIProvider implements LLMProvider {
  name = 'OpenAI'
  model = 'gpt-4o-mini'
  costPerInputToken = COST_PER_INPUT_TOKEN
  costPerOutputToken = COST_PER_OUTPUT_TOKEN

  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? ''
    if (!this.apiKey) {
      throw new Error('OpenAI API key not found. Set OPENAI_API_KEY environment variable.')
    }
  }

  async estimate(description: string): Promise<ProviderResponse> {
    const prompt = generatePrompt(description)
    const startTime = Date.now()

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a helpful nutrition expert. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
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
          error: `OpenAI API error: ${error}`
        }
      }

      const data = await response.json()
      const content = data.choices[0].message.content
      const parsed = JSON.parse(content)
      const items = validateResponse(parsed)

      return {
        items,
        latencyMs,
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
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
