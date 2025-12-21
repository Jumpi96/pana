import { useState, useEffect } from 'react'
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
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    loadData()
  }, [currentDate])

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

  async function loadData() {
    try {
      setLoading(true)
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
    }
  }

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
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="text-4xl mb-4">🥗</div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {!isOnline && <OfflineBanner />}

      {/* Header */}
      <header className="bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">🥗 Pana</h1>
            <div className="flex gap-2">
              <Link
                to="/weekly"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <TrendingUp className="w-5 h-5" />
              </Link>
              <Link
                to="/settings"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <SettingsIcon className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleToday}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{formatDate(currentDate)}</span>
            </button>

            <button
              onClick={handleNextDay}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
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
