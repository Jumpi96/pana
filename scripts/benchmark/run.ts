#!/usr/bin/env npx tsx
/**
 * LLM Provider Benchmark Runner
 *
 * Usage:
 *   npx tsx scripts/benchmark/run.ts
 *
 * Required environment variables:
 *   OPENAI_API_KEY     - OpenAI API key
 *   ANTHROPIC_API_KEY  - Anthropic API key
 *   GOOGLE_API_KEY     - Google AI API key
 *
 * Optional:
 *   BENCHMARK_PROVIDERS - Comma-separated list of providers to test (default: all)
 *   BENCHMARK_DELAY     - Delay between requests in ms (default: 500)
 */

import 'dotenv/config'
import type { LLMProvider, TestResult, BenchmarkResults } from './types'
import { testCases } from './dataset'
import { calculateItemMetrics, calculateProviderSummary } from './metrics'
import { saveRawResults, saveSummaryReport, printSummary } from './report'
import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import { GoogleProvider } from './providers/google'

const DELAY_BETWEEN_REQUESTS = Number(process.env.BENCHMARK_DELAY) || 500

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Google models to test
const GOOGLE_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
]

function getProviders(): LLMProvider[] {
  const selected = process.env.BENCHMARK_PROVIDERS?.toLowerCase().split(',').map(s => s.trim())
  const providers: LLMProvider[] = []

  const shouldInclude = (name: string) => !selected || selected.includes(name.toLowerCase())

  if (shouldInclude('openai')) {
    try {
      providers.push(new OpenAIProvider())
    } catch (e) {
      console.warn(`Skipping OpenAI: ${(e as Error).message}`)
    }
  }

  if (shouldInclude('anthropic')) {
    try {
      providers.push(new AnthropicProvider())
    } catch (e) {
      console.warn(`Skipping Anthropic: ${(e as Error).message}`)
    }
  }

  if (shouldInclude('google')) {
    for (const model of GOOGLE_MODELS) {
      try {
        providers.push(new GoogleProvider(model))
      } catch (e) {
        console.warn(`Skipping Google ${model}: ${(e as Error).message}`)
      }
    }
  }

  return providers
}

async function runBenchmark(): Promise<BenchmarkResults> {
  const providers = getProviders()

  if (providers.length === 0) {
    console.error('No providers available. Please set API keys in environment variables.')
    process.exit(1)
  }

  console.log(`\nStarting benchmark with ${providers.length} provider(s):`)
  providers.forEach(p => console.log(`  - ${p.name} (${p.model})`))
  console.log(`\nTest cases: ${testCases.length}`)
  console.log(`Delay between requests: ${DELAY_BETWEEN_REQUESTS}ms`)
  console.log('')

  const results: TestResult[] = []
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  let totalRequests = providers.length * testCases.length
  let completedRequests = 0

  for (const provider of providers) {
    console.log(`\nTesting ${provider.name} (${provider.model})...`)

    for (const testCase of testCases) {
      completedRequests++
      const progress = `[${completedRequests}/${totalRequests}]`
      process.stdout.write(`${progress} ${testCase.id}: ${testCase.description.substring(0, 30)}... `)

      const response = await provider.estimate(testCase.description)

      if (response.error) {
        console.log(`ERROR: ${response.error}`)
        results.push({
          testCaseId: testCase.id,
          description: testCase.description,
          category: testCase.category,
          provider: provider.name,
          model: provider.model,
          latencyMs: response.latencyMs,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          cost: (response.inputTokens * provider.costPerInputToken) + (response.outputTokens * provider.costPerOutputToken),
          expectedItems: testCase.expected.items,
          actualItems: response.items,
          metrics: {
            itemCountMatch: false,
            caloriesMAPE: 100,
            proteinMAPE: 100,
            carbsMAPE: 100,
            fatMAPE: 100,
            overallMAPE: 100,
          },
          error: response.error,
        })
      } else {
        const metrics = calculateItemMetrics(testCase.expected.items, response.items)
        console.log(`OK (${response.latencyMs}ms, MAPE: ${metrics.overallMAPE.toFixed(1)}%)`)

        results.push({
          testCaseId: testCase.id,
          description: testCase.description,
          category: testCase.category,
          provider: provider.name,
          model: provider.model,
          latencyMs: response.latencyMs,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          cost: (response.inputTokens * provider.costPerInputToken) + (response.outputTokens * provider.costPerOutputToken),
          expectedItems: testCase.expected.items,
          actualItems: response.items,
          metrics,
        })
      }

      // Delay between requests to avoid rate limiting
      await sleep(DELAY_BETWEEN_REQUESTS)
    }
  }

  // Calculate summaries
  const summaries = providers.map(provider =>
    calculateProviderSummary(
      provider.name,
      provider.model,
      results,
      provider.costPerInputToken,
      provider.costPerOutputToken
    )
  )

  return {
    timestamp,
    testCases: testCases.length,
    providers: providers.map(p => p.name),
    results,
    summaries,
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('LLM Provider Benchmark for Meal Estimation')
  console.log('='.repeat(60))

  try {
    const results = await runBenchmark()

    // Save results
    const jsonPath = saveRawResults(results)
    console.log(`\nRaw results saved to: ${jsonPath}`)

    const summaryPath = saveSummaryReport(results)
    console.log(`Summary saved to: ${summaryPath}`)

    // Print summary to console
    printSummary(results)

  } catch (error) {
    console.error('Benchmark failed:', error)
    process.exit(1)
  }
}

main()
