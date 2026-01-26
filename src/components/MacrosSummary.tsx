import type { DailyTotals, ExpectedMacros } from '../types'
import { cn } from '../lib/utils'

interface Props {
  actual: DailyTotals
  expected: ExpectedMacros
  alcoholCalories?: number
  maxDailyDrinks?: number
}

export function MacrosSummary({ actual, expected, alcoholCalories, maxDailyDrinks }: Props) {
  const showAlcohol = alcoholCalories !== undefined && maxDailyDrinks !== undefined

  return (
    <div className="bg-white dark:bg-zinc-950 border-b-4 border-black dark:border-zinc-800 transition-all">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className={cn("grid gap-3", showAlcohol ? "grid-cols-5" : "grid-cols-4")}>
          <MacroCard
            label="Calories"
            actual={actual.calories}
            expected={expected.calories}
            unit=""
            color="text-black dark:text-white"
            bgColor="bg-white dark:bg-zinc-900"
          />
          <MacroCard
            label="Protein"
            actual={actual.protein_g}
            expected={expected.protein_g}
            unit="g"
            color="text-blue-600 dark:text-blue-400"
            bgColor="bg-blue-50 dark:bg-blue-900/20"
          />
          <MacroCard
            label="Carbs"
            actual={actual.carbs_g}
            expected={expected.carbs_g}
            unit="g"
            color="text-orange-600 dark:text-orange-400"
            bgColor="bg-orange-50 dark:bg-orange-900/20"
          />
          <MacroCard
            label="Fat"
            actual={actual.fat_g}
            expected={expected.fat_g}
            unit="g"
            color="text-yellow-600 dark:text-yellow-400"
            bgColor="bg-yellow-50 dark:bg-yellow-900/20"
          />
          {showAlcohol && (
            <AlcoholCard
              alcoholCalories={alcoholCalories}
              maxDailyDrinks={maxDailyDrinks}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function MacroCard({ label, actual, expected, unit, color, bgColor }: {
  label: string
  actual: number
  expected: number
  unit: string
  color: string
  bgColor: string
}) {
  const percentage = expected > 0 ? Math.min((actual / expected) * 100, 100) : 0
  const widthPercent = percentage.toFixed(1)

  return (
    <div className={cn(
      "p-3 rounded-2xl border-2 border-black dark:border-zinc-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] transition-transform hover:-translate-y-1 active:translate-y-0",
      bgColor
    )}>
      <div className="text-[10px] uppercase font-black tracking-tighter mb-1 opacity-60">
        {label}
      </div>
      <div className={cn("text-lg font-black tracking-tighter", color)}>
        {Math.round(actual)}{unit}
      </div>
      <div className="mt-2 h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden border border-black/10 dark:border-white/10">
        <div
          className={cn("h-full transition-all duration-500 rounded-full bg-current", color)}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <div className="text-[9px] mt-1 font-bold opacity-40 uppercase">
        Goal: {Math.round(expected)}{unit}
      </div>
    </div>
  )
}

function AlcoholCard({ alcoholCalories, maxDailyDrinks }: {
  alcoholCalories: number
  maxDailyDrinks: number
}) {
  const drinks = Math.round((alcoholCalories || 0) / 98 * 10) / 10
  const isOverLimit = drinks > maxDailyDrinks
  const percentage = maxDailyDrinks > 0 ? Math.min((drinks / maxDailyDrinks) * 100, 100) : 0
  const widthPercent = percentage.toFixed(1)

  const color = isOverLimit ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'
  const bgColor = isOverLimit ? 'bg-red-50 dark:bg-red-900/20' : 'bg-purple-50 dark:bg-purple-900/20'

  return (
    <div className={cn(
      "p-3 rounded-2xl border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] transition-transform hover:-translate-y-1 active:translate-y-0",
      bgColor,
      isOverLimit ? 'border-red-500' : 'border-black dark:border-zinc-800'
    )}>
      <div className="text-[10px] uppercase font-black tracking-tighter mb-1 opacity-60 flex items-center gap-1">
        <span>🍷</span> Drinks
      </div>
      <div className={cn("text-lg font-black tracking-tighter", color)}>
        {drinks}
      </div>
      <div className="mt-2 h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden border border-black/10 dark:border-white/10">
        <div
          className={cn("h-full transition-all duration-500 rounded-full", isOverLimit ? 'bg-red-500' : 'bg-purple-500')}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <div className="text-[9px] mt-1 font-bold opacity-40 uppercase">
        Max: {maxDailyDrinks}/day
      </div>
    </div>
  )
}
