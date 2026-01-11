import { useState } from 'react'
import { createPortal } from 'react-dom'
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

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-6 transition-all">
      <div className="bg-white dark:bg-zinc-950 rounded-[40px] border-[4px] border-black dark:border-zinc-800 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.05)] max-w-md w-full p-10 space-y-8 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-6">🥑</div>
          <h1 className="text-3xl font-[900] tracking-tighter italic uppercase text-black dark:text-white leading-none">
            Welcome to Pana<span className="text-green-500">!</span>
          </h1>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-4">
            Let's build your goal engine 🚀
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex gap-2">
          <div className={`flex-1 h-2 rounded-full border-2 border-black dark:border-zinc-800 transition-all ${step >= 1 ? 'bg-green-500' : 'bg-transparent'}`} />
          <div className={`flex-1 h-2 rounded-full border-2 border-black dark:border-zinc-800 transition-all ${step >= 2 ? 'bg-green-500' : 'bg-transparent'}`} />
        </div>

        {/* Step 1: Calorie Target */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest mb-3 pl-2">Daily Calorie Target</h2>
              <input
                type="number"
                value={calorieTarget}
                onChange={e => setCalorieTarget(Number(e.target.value))}
                min="1"
                step="50"
                className="w-full px-6 py-4 rounded-2xl border-[3px] border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 text-3xl font-[900] tracking-tighter italic focus:ring-4 focus:ring-green-500/10 outline-none transition-all shadow-inner"
                autoFocus
              />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-3 pl-2 leading-relaxed">
                How many calories are we hunting today? 🥗
              </p>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-[900] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[6px_6px_0px_0px_rgba(34,197,94,1)] text-lg italic"
            >
              Keep Going →
            </button>
          </div>
        )}

        {/* Step 2: Macro Distribution */}
        {step === 2 && (
          <>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-sm font-black uppercase tracking-widest italic">Macro Distribution</h2>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-black border-2 ${isValidTotal ? 'bg-green-500 text-white border-black' : 'bg-red-500 text-white border-black'}`}>
                    {total.toFixed(0)}%
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Protein */}
                  <div className="group">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-blue-600">🥩 Protein</label>
                      <span className="text-[10px] font-black italic text-gray-400">
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
                      className="w-full h-4 bg-gray-100 dark:bg-zinc-900 rounded-full appearance-none cursor-pointer accent-blue-600 border-2 border-black/10 transition-all"
                    />
                  </div>

                  {/* Carbs */}
                  <div className="group">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-orange-600">🍞 Carbs</label>
                      <span className="text-[10px] font-black italic text-gray-400">
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
                      className="w-full h-4 bg-gray-100 dark:bg-zinc-900 rounded-full appearance-none cursor-pointer accent-orange-600 border-2 border-black/10 transition-all"
                    />
                  </div>

                  {/* Fat */}
                  <div className="group">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-yellow-600">🥑 Fat</label>
                      <span className="text-[10px] font-black italic text-gray-400">
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
                      className="w-full h-4 bg-gray-100 dark:bg-zinc-900 rounded-full appearance-none cursor-pointer accent-yellow-600 border-2 border-black/10 transition-all"
                    />
                  </div>
                </div>
              </div>
              {!isValidTotal && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  Percentages must sum to exactly 100%
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <button
                onClick={handleFinish}
                disabled={!isValidTotal || saving}
                className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-[900] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[6px_6px_0px_0px_rgba(34,197,94,1)] text-lg italic"
              >
                {saving ? 'Locking it in...' : 'Lock it in! 🥑'}
              </button>
              <button
                onClick={() => setStep(1)}
                className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
              >
                ← Wait, go back
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
