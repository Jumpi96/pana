import { useState } from 'react'
import { upsertUserSettings } from '../lib/api'

interface Props {
  onComplete: () => void
}

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [calorieTarget, setCalorieTarget] = useState(2000)
  const [proteinPct, setProteinPct] = useState(30)
  const [carbsPct, setCarbsPct] = useState(40)
  const [fatPct, setFatPct] = useState(30)
  const [saving, setSaving] = useState(false)

  function handleNext() {
    if (calorieTarget < 1) {
      alert('Calorie target must be at least 1')
      return
    }
    setStep(2)
  }

  async function handleFinish() {
    const total = proteinPct + carbsPct + fatPct
    if (Math.abs(total - 100) > 0.01) {
      alert(`Macro percentages must sum to 100% (currently ${total.toFixed(1)}%)`)
      return
    }

    try {
      setSaving(true)
      await upsertUserSettings({
        daily_calories_target: calorieTarget,
        protein_pct: proteinPct,
        carbs_pct: carbsPct,
        fat_pct: fatPct
      })

      onComplete()
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings. Please try again.')
      setSaving(false)
    }
  }

  const total = proteinPct + carbsPct + fatPct
  const isValidTotal = Math.abs(total - 100) < 0.01

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-950 rounded-lg shadow-xl max-w-md w-full p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
            Welcome to Pana! 🥗
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Let's set up your daily nutrition goals
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex gap-2">
          <div className={`flex-1 h-1 rounded ${step >= 1 ? 'bg-green-600' : 'bg-gray-200 dark:bg-zinc-800'}`} />
          <div className={`flex-1 h-1 rounded ${step >= 2 ? 'bg-green-600' : 'bg-gray-200 dark:bg-zinc-800'}`} />
        </div>

        {/* Step 1: Calorie Target */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold mb-2">Daily Calorie Target</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                How many calories do you want to consume per day?
              </p>
              <input
                type="number"
                value={calorieTarget}
                onChange={e => setCalorieTarget(Number(e.target.value))}
                min="1"
                step="50"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-lg font-medium focus:ring-2 focus:ring-green-500 outline-none"
                autoFocus
              />
            </div>

            <button
              onClick={handleNext}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Macro Distribution */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Macro Distribution</h2>
                <div className={`text-sm font-medium ${isValidTotal ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  Total: {total.toFixed(1)}%
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Adjust the percentage split for protein, carbs, and fat
              </p>

              <div className="space-y-4">
                {/* Protein */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Protein</label>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {proteinPct}% ({((calorieTarget * proteinPct / 100) / 4).toFixed(0)}g)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={proteinPct}
                    onChange={e => setProteinPct(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                </div>

                {/* Carbs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Carbs</label>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {carbsPct}% ({((calorieTarget * carbsPct / 100) / 4).toFixed(0)}g)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={carbsPct}
                    onChange={e => setCarbsPct(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                </div>

                {/* Fat */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Fat</label>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {fatPct}% ({((calorieTarget * fatPct / 100) / 9).toFixed(0)}g)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={fatPct}
                    onChange={e => setFatPct(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                </div>
              </div>

              {!isValidTotal && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  Percentages must sum to exactly 100%
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={!isValidTotal || saving}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Finish'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
