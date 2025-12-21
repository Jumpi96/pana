import type { DailyTotals, ExpectedMacros } from '../types'
import { cn } from '../lib/utils'

interface Props {
  actual: DailyTotals
  expected: ExpectedMacros
}

export function MacrosSummary({ actual, expected }: Props) {
  return (
    <div className="bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="grid grid-cols-4 gap-4">
          <MacroCard
            label="Calories"
            actual={actual.calories}
            expected={expected.calories}
            unit=""
          />
          <MacroCard
            label="Protein"
            actual={actual.protein_g}
            expected={expected.protein_g}
            unit="g"
          />
          <MacroCard
            label="Carbs"
            actual={actual.carbs_g}
            expected={expected.carbs_g}
            unit="g"
          />
          <MacroCard
            label="Fat"
            actual={actual.fat_g}
            expected={expected.fat_g}
            unit="g"
          />
        </div>
      </div>
    </div>
  )
}

function MacroCard({ label, actual, expected, unit }: {
  label: string
  actual: number
  expected: number
  unit: string
}) {
  const percentage = expected === 0 ? 0 : (actual / expected) * 100

  function getStatusColor(pct: number): string {
    if (pct >= 90 && pct <= 110) return 'text-green-600 dark:text-green-400'
    if (pct >= 70 && pct <= 130) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="text-center">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={cn("text-lg font-bold", getStatusColor(percentage))}>
        {actual.toFixed(0)}{unit}
      </div>
      <div className="text-xs text-gray-400">
        / {expected.toFixed(0)}{unit}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {percentage.toFixed(0)}%
      </div>
    </div>
  )
}
