/**
 * Anthropic Provider Adapter (claude-3-haiku)
 */

import type { LLMProvider, ProviderResponse } from './base'
import { generatePrompt, validateResponse } from './base'

// https://www.anthropic.com/pricing (as of Jan 2025)
const COST_PER_INPUT_TOKEN = 0.25 / 1_000_000   // $0.25 per 1M input tokens
const COST_PER_OUTPUT_TOKEN = 1.25 / 1_000_000  // $1.25 per 1M output tokens

export class AnthropicProvider implements LLMProvider {
  name = 'Anthropic'
  model = 'claude-3-haiku-20240307'
  costPerInputToken = COST_PER_INPUT_TOKEN
  costPerOutputToken = COST_PER_OUTPUT_TOKEN

  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.ANTHROPIC_API_KEY ?? ''
    if (!this.apiKey) {
      throw new Error('Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable.')
    }
  }

  async estimate(description: string): Promise<ProviderResponse> {
    const prompt = generatePrompt(description)
    const startTime = Date.now()

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\nRespond with valid JSON only, no markdown formatting or code blocks.`
            }
          ],
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
          error: `Anthropic API error: ${error}`
        }
      }

      const data = await response.json()

      // Extract text content from Anthropic response
      const textContent = data.content?.find((c: { type: string }) => c.type === 'text')
      if (!textContent?.text) {
        return {
          items: [],
          latencyMs,
          inputTokens: data.usage?.input_tokens ?? 0,
          outputTokens: data.usage?.output_tokens ?? 0,
          error: 'No text content in response'
        }
      }

      // Parse JSON from response (may be wrapped in code blocks)
      let jsonText = textContent.text.trim()
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      const parsed = JSON.parse(jsonText)
      const items = validateResponse(parsed)

      return {
        items,
        latencyMs,
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
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
