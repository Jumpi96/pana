/**
 * Report Generation for Benchmark Results
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type { BenchmarkResults } from './types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RESULTS_DIR = path.join(__dirname, 'results')

/**
 * Ensure results directory exists
 */
function ensureResultsDir(): void {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true })
  }
}

/**
 * Save raw results as JSON
 */
export function saveRawResults(results: BenchmarkResults): string {
  ensureResultsDir()
  const filename = `results-${results.timestamp}.json`
  const filepath = path.join(RESULTS_DIR, filename)
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2))
  return filepath
}

/**
 * Generate markdown summary report
 */
export function generateSummaryReport(results: BenchmarkResults): string {
  const lines: string[] = []

  lines.push('# LLM Provider Benchmark Results')
  lines.push('')
  lines.push(`**Date:** ${new Date(results.timestamp).toLocaleString()}`)
  lines.push(`**Test Cases:** ${results.testCases}`)
  lines.push(`**Providers:** ${results.providers.join(', ')}`)
  lines.push('')

  // Summary table
  lines.push('## Summary')
  lines.push('')
  lines.push('| Provider | Model | Accuracy (MAPE) | Avg Latency | Cost/1000 calls | Success Rate | Item Accuracy |')
  lines.push('|----------|-------|-----------------|-------------|-----------------|--------------|---------------|')

  // Sort by accuracy (lower MAPE is better)
  const sortedSummaries = [...results.summaries].sort((a, b) => a.avgOverallMAPE - b.avgOverallMAPE)

  for (const summary of sortedSummaries) {
    const successRate = `${summary.successfulTests}/${summary.totalTests}`
    lines.push(
      `| ${summary.provider} | ${summary.model} | ${summary.avgOverallMAPE}% | ${summary.avgLatencyMs}ms | $${summary.costPer1000Calls.toFixed(2)} | ${successRate} | ${summary.itemCountAccuracy}% |`
    )
  }
  lines.push('')

  // Detailed metrics by macro
  lines.push('## Accuracy by Macro Type')
  lines.push('')
  lines.push('| Provider | Calories MAPE | Protein MAPE | Carbs MAPE | Fat MAPE |')
  lines.push('|----------|---------------|--------------|------------|----------|')

  for (const summary of sortedSummaries) {
    lines.push(
      `| ${summary.provider} | ${summary.avgCaloriesMAPE}% | ${summary.avgProteinMAPE}% | ${summary.avgCarbsMAPE}% | ${summary.avgFatMAPE}% |`
    )
  }
  lines.push('')

  // Results by category
  lines.push('## Results by Category')
  lines.push('')

  const categories = Array.from(new Set(results.results.map(r => r.category)))
  for (const category of categories) {
    lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`)
    lines.push('')

    const categoryResults = results.results.filter(r => r.category === category)

    for (const provider of results.providers) {
      const providerResults = categoryResults.filter(r => r.provider === provider && !r.error)
      if (providerResults.length === 0) continue

      const avgMAPE = providerResults.reduce((sum, r) => sum + r.metrics.overallMAPE, 0) / providerResults.length
      lines.push(`- **${provider}:** ${avgMAPE.toFixed(1)}% avg MAPE`)
    }
    lines.push('')
  }

  // Errors
  const errorResults = results.results.filter(r => r.error)
  if (errorResults.length > 0) {
    lines.push('## Errors')
    lines.push('')

    for (const result of errorResults) {
      lines.push(`- **${result.provider}** on "${result.description}": ${result.error}`)
    }
    lines.push('')
  }

  // Recommendation
  lines.push('## Recommendation')
  lines.push('')

  if (sortedSummaries.length > 0) {
    const best = sortedSummaries[0]
    const cheapest = [...results.summaries].sort((a, b) => a.costPer1000Calls - b.costPer1000Calls)[0]
    const fastest = [...results.summaries].sort((a, b) => a.avgLatencyMs - b.avgLatencyMs)[0]

    lines.push(`- **Most Accurate:** ${best.provider} (${best.model}) with ${best.avgOverallMAPE}% MAPE`)
    lines.push(`- **Cheapest:** ${cheapest.provider} (${cheapest.model}) at $${cheapest.costPer1000Calls.toFixed(2)}/1000 calls`)
    lines.push(`- **Fastest:** ${fastest.provider} (${fastest.model}) at ${fastest.avgLatencyMs}ms avg latency`)
    lines.push('')

    // Overall recommendation based on weighted score
    // Weight: accuracy (50%), cost (30%), speed (20%)
    const scored = results.summaries.map(s => {
      const accuracyScore = 100 - s.avgOverallMAPE // Higher is better
      const costScore = 100 - (s.costPer1000Calls / Math.max(...results.summaries.map(x => x.costPer1000Calls))) * 100
      const speedScore = 100 - (s.avgLatencyMs / Math.max(...results.summaries.map(x => x.avgLatencyMs))) * 100
      const totalScore = (accuracyScore * 0.5) + (costScore * 0.3) + (speedScore * 0.2)
      return { ...s, totalScore }
    }).sort((a, b) => b.totalScore - a.totalScore)

    if (scored.length > 0) {
      lines.push(`**Overall Recommendation:** ${scored[0].provider} (${scored[0].model})`)
      lines.push(`- Weighted score: ${scored[0].totalScore.toFixed(1)} (accuracy 50%, cost 30%, speed 20%)`)
    }
  }

  return lines.join('\n')
}

/**
 * Save markdown summary to file
 */
export function saveSummaryReport(results: BenchmarkResults): string {
  ensureResultsDir()
  const report = generateSummaryReport(results)
  const filename = `summary-${results.timestamp}.md`
  const filepath = path.join(RESULTS_DIR, filename)
  fs.writeFileSync(filepath, report)
  return filepath
}

/**
 * Print summary to console
 */
export function printSummary(results: BenchmarkResults): void {
  console.log('\n' + '='.repeat(60))
  console.log('BENCHMARK RESULTS')
  console.log('='.repeat(60))
  console.log(`Test Cases: ${results.testCases}`)
  console.log(`Timestamp: ${results.timestamp}`)
  console.log('')

  console.log('Provider Comparison:')
  console.log('-'.repeat(60))

  const sorted = [...results.summaries].sort((a, b) => a.avgOverallMAPE - b.avgOverallMAPE)
  for (const s of sorted) {
    console.log(`${s.provider} (${s.model}):`)
    console.log(`  Accuracy: ${s.avgOverallMAPE}% MAPE`)
    console.log(`  Latency:  ${s.avgLatencyMs}ms avg`)
    console.log(`  Cost:     $${s.costPer1000Calls.toFixed(2)}/1000 calls`)
    console.log(`  Success:  ${s.successfulTests}/${s.totalTests}`)
    console.log('')
  }
}
