import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Settings as SettingsIcon, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getLocalDate, formatDate, addDays } from '../lib/utils'
import { fetchMealEntries, fetchUserSettings, fetchDailyTotals } from '../lib/api'
import { calculateExpectedMacros } from '../lib/macros'
import { MealGroupSection } from '../components/MealGroupSection'
import { MacrosSummary } from '../components/MacrosSummary'
import { OfflineBanner } from '../components/OfflineBanner'
import { Onboarding } from '../components/Onboarding'
import type { MealEntry, UserSettings, DailyTotals, MealGroup } from '../types'

export function DailyTracking() {
  const [currentDate, setCurrentDate] = useState(getLocalDate())
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [totals, setTotals] = useState<DailyTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true)
      else setIsRefreshing(true)

      const [mealsData, settingsData, totalsData] = await Promise.all([
        fetchMealEntries(currentDate),
        fetchUserSettings(),
        fetchDailyTotals(currentDate)
      ])

      setMeals(mealsData)
      setSettings(settingsData)
      setTotals(totalsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [currentDate])

  useEffect(() => {
    loadData(true)
  }, [loadData])

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

  function handlePrevDay() {
    setCurrentDate(prev => addDays(prev, -1))
  }

  function handleNextDay() {
    setCurrentDate(prev => addDays(prev, 1))
  }

  function handleToday() {
    setCurrentDate(getLocalDate())
  }

  const mealGroups: MealGroup[] = ['breakfast', 'lunch', 'snack', 'dinner']
  const expected = settings ? calculateExpectedMacros(settings) : null

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-zinc-950 transition-colors">
        <div className="text-center animate-bounce">
          <div className="text-6xl mb-4 grayscale-[0.5] hover:grayscale-0 transition-all cursor-progress">🥗</div>
          <div className="flex flex-col items-center gap-2">
            <p className="font-black text-2xl text-green-600 dark:text-green-400 tracking-tighter">PANA IS LOADING...</p>
            <div className="w-48 h-2 bg-gray-100 dark:bg-zinc-900 rounded-full overflow-hidden border-2 border-black dark:border-white">
              <div className="h-full bg-green-500 animate-progress origin-left" style={{ width: '40%' }}></div>
            </div>
            <p className="text-xs text-gray-400 font-mono italic">sharpening the forks... 🍴</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {!isOnline && <OfflineBanner />}

      {/* Header */}
      <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b-4 border-black dark:border-zinc-800 sticky top-0 z-30 transition-all">
        {isRefreshing && (
          <div className="absolute top-0 left-0 w-full h-1 overflow-hidden">
            <div className="h-full bg-green-500 animate-progress origin-left"></div>
          </div>
        )}
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={handleToday}>
              <span className="text-3xl rotate-12 group-hover:rotate-0 transition-transform">🥗</span>
              <h1 className="text-3xl font-black text-black dark:text-white tracking-tighter italic uppercase">
                Pana<span className="text-green-500">!</span>
              </h1>
            </div>
            <div className="flex gap-2">
              <Link
                to="/weekly"
                className="p-2.5 rounded-xl border-2 border-transparent hover:border-black dark:hover:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-all active:scale-90"
              >
                <TrendingUp className="w-5 h-5" />
              </Link>
              <Link
                to="/settings"
                className="p-2.5 rounded-xl border-2 border-transparent hover:border-black dark:hover:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-all active:scale-90"
              >
                <SettingsIcon className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-100 dark:bg-zinc-900 p-1.5 rounded-2xl border-2 border-black dark:border-zinc-800">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-all active:scale-90 shadow-sm border-2 border-transparent hover:border-black dark:hover:border-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleToday}
              className="flex items-center gap-2 px-6 py-2 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-all active:scale-95 group"
            >
              <Calendar className="w-4 h-4 text-green-600 group-hover:scale-110 transition-transform" />
              <span className="font-black text-sm uppercase tracking-widest">{formatDate(currentDate)}</span>
            </button>

            <button
              onClick={handleNextDay}
              className="p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-all active:scale-90 shadow-sm border-2 border-transparent hover:border-black dark:hover:border-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Macros Summary */}
      {totals && expected && (
        <MacrosSummary actual={totals} expected={expected} />
      )}

      {/* Meal Groups */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-20">
        {mealGroups.map(group => (
          <MealGroupSection
            key={group}
            mealGroup={group}
            date={currentDate}
            meals={meals.filter(m => m.meal_group === group)}
            onMealsChange={loadData}
            isOnline={isOnline}
          />
        ))}
      </main>

      {/* Onboarding Modal */}
      {!loading && !settings && (
        <Onboarding onComplete={loadData} />
      )}
    </div>
  )
}
