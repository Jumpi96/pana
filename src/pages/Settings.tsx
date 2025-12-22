import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, Loader2 } from 'lucide-react'
import { fetchUserSettings, upsertUserSettings } from '../lib/api'
import { supabase } from '../lib/supabase'

export function Settings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [calorieTarget, setCalorieTarget] = useState(2000)
  const [proteinPct, setProteinPct] = useState(30)
  const [carbsPct, setCarbsPct] = useState(40)
  const [fatPct, setFatPct] = useState(30)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const settings = await fetchUserSettings()

      if (settings) {
        setCalorieTarget(settings.daily_calories_target)
        setProteinPct(Number(settings.protein_pct))
        setCarbsPct(Number(settings.carbs_pct))
        setFatPct(Number(settings.fat_pct))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    // Validate percentages sum to 100
    const total = proteinPct + carbsPct + fatPct
    if (Math.abs(total - 100) > 0.01) {
      alert(`Macro percentages must sum to 100% (currently ${total.toFixed(1)}%)`)
      return
    }

    if (calorieTarget < 1) {
      alert('Calorie target must be at least 1')
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

      alert('Settings saved!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    if (!confirm('Sign out?')) return

    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Failed to sign out:', error)
      alert('Failed to sign out')
    }
  }

  const total = proteinPct + carbsPct + fatPct
  const isValidTotal = Math.abs(total - 100) < 0.01

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-bold text-green-600 dark:text-green-400">Settings</h1>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Daily Calorie Target */}
        <section className="bg-white dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Daily Calorie Target</h2>
          <div className="space-y-2">
            <input
              type="number"
              value={calorieTarget}
              onChange={e => setCalorieTarget(Number(e.target.value))}
              min="1"
              step="50"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-lg font-medium focus:ring-2 focus:ring-green-500 outline-none"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your daily calorie goal
            </p>
          </div>
        </section>

        {/* Macro Percentages */}
        <section className="bg-white dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Macro Distribution</h2>
            <div className={`text-sm font-medium ${isValidTotal ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              Total: {total.toFixed(1)}%
            </div>
          </div>

          <div className="space-y-6">
            {/* Protein */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium">Protein</label>
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
                <label className="font-medium">Carbs</label>
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
                <label className="font-medium">Fat</label>
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
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">
              Percentages must sum to exactly 100%
            </p>
          )}
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleSave}
            disabled={!isValidTotal || saving}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          <button
            onClick={handleSignOut}
            className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </main>
    </div>
  )
}
