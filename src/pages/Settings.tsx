import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, Loader2 } from 'lucide-react'
import { fetchUserSettings, upsertUserSettings } from '../lib/api'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'

export function Settings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [calorieTarget, setCalorieTarget] = useState(2000)
  const [proteinPct, setProteinPct] = useState(30)
  const [carbsPct, setCarbsPct] = useState(40)
  const [fatPct, setFatPct] = useState(30)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

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
      <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b-4 border-black dark:border-zinc-800 sticky top-0 z-30 transition-all">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-900 border-2 border-transparent hover:border-black transition-all active:scale-90"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-3xl rotate-12">⚙️</span>
              <h1 className="text-3xl font-black text-black dark:text-white tracking-tighter italic uppercase">
                Settings<span className="text-green-500">!</span>
              </h1>
            </div>
            <div className="w-10" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-10">
        {/* Daily Calorie Target */}
        <section className="bg-white dark:bg-zinc-950 rounded-3xl border-[3px] border-black dark:border-zinc-800 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.05)]">
          <h2 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-2 italic">
            <span className="text-2xl not-italic">🎯</span> Daily Calorie Goal
          </h2>
          <div className="space-y-4">
            <input
              type="number"
              value={calorieTarget}
              onChange={e => setCalorieTarget(Number(e.target.value))}
              min="1"
              step="50"
              className="w-full px-6 py-4 rounded-2xl border-[3px] border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 text-2xl font-black tracking-tighter italic focus:ring-4 focus:ring-green-500/20 outline-none transition-all shadow-inner"
            />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">
              How many calories are we hunting today? 🥗
            </p>
          </div>
        </section>

        {/* Macro Percentages */}
        <section className="bg-white dark:bg-zinc-950 rounded-3xl border-[3px] border-black dark:border-zinc-800 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 italic">
              <span className="text-2xl not-italic">⚖️</span> Macro Splits
            </h2>
            <div className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2",
              isValidTotal
                ? 'bg-green-500 text-white border-black'
                : 'bg-red-500 text-white border-black animate-bounce'
            )}>
              Total: {total.toFixed(0)}%
            </div>
          </div>

          <div className="space-y-10">
            {/* Protein */}
            <div className="group">
              <div className="flex items-center justify-between mb-3 px-1">
                <label className="text-sm font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  🥩 Protein <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded text-[10px]">{proteinPct}%</span>
                </label>
                <span className="text-xs font-black italic text-gray-400">
                  {((calorieTarget * proteinPct / 100) / 4).toFixed(0)}g
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={proteinPct}
                onChange={e => setProteinPct(Number(e.target.value))}
                className="w-full h-4 bg-gray-100 dark:bg-zinc-900 rounded-full appearance-none cursor-pointer accent-blue-600 border-2 border-black/10 dark:border-white/10 group-hover:border-black/30 transition-all"
              />
            </div>

            {/* Carbs */}
            <div className="group">
              <div className="flex items-center justify-between mb-3 px-1">
                <label className="text-sm font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  🍞 Carbs <span className="bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded text-[10px]">{carbsPct}%</span>
                </label>
                <span className="text-xs font-black italic text-gray-400">
                  {((calorieTarget * carbsPct / 100) / 4).toFixed(0)}g
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={carbsPct}
                onChange={e => setCarbsPct(Number(e.target.value))}
                className="w-full h-4 bg-gray-100 dark:bg-zinc-900 rounded-full appearance-none cursor-pointer accent-orange-600 border-2 border-black/10 dark:border-white/10 group-hover:border-black/30 transition-all"
              />
            </div>

            {/* Fat */}
            <div className="group">
              <div className="flex items-center justify-between mb-3 px-1">
                <label className="text-sm font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                  🥑 Fat <span className="bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded text-[10px]">{fatPct}%</span>
                </label>
                <span className="text-xs font-black italic text-gray-400">
                  {((calorieTarget * fatPct / 100) / 9).toFixed(0)}g
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={fatPct}
                onChange={e => setFatPct(Number(e.target.value))}
                className="w-full h-4 bg-gray-100 dark:bg-zinc-900 rounded-full appearance-none cursor-pointer accent-yellow-600 border-2 border-black/10 dark:border-white/10 group-hover:border-black/30 transition-all"
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
        <div className="flex flex-col gap-4 py-10">
          <button
            onClick={handleSave}
            disabled={!isValidTotal || saving || !isOnline}
            className="w-full px-6 py-5 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[6px_6px_0px_0px_rgba(34,197,94,1)] text-lg italic"
          >
            {!isOnline ? 'Network Required 🌐' : saving ? 'Locking it in...' : 'Lock in Settings! 🔒'}
          </button>

          <button
            onClick={handleSignOut}
            className="w-full px-6 py-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 border-2 border-dashed border-red-200 dark:border-red-900/30"
          >
            <LogOut className="w-5 h-5" />
            Quit for now
          </button>
        </div>
      </main>
    </div>
  )
}
