import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar, Home, Settings as SettingsIcon, Loader2 } from 'lucide-react'
import { getLocalDate, getMondayOfWeek, addDays, formatDate } from '../lib/utils'
import { fetchUserSettings, fetchWeeklyTotals } from '../lib/api'
import { calculateExpectedMacros, calculateWeeklyRebalance } from '../lib/macros'
import { MacrosSummary } from '../components/MacrosSummary'
import { Onboarding } from '../components/Onboarding'
import type { UserSettings, DailyTotals } from '../types'

export function WeeklyView() {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    getLocalDate(getMondayOfWeek(new Date()))
  )
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [totals, setTotals] = useState<DailyTotals | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [currentWeekStart])

  async function loadData() {
    try {
      setLoading(true)
      const [settingsData, totalsData] = await Promise.all([
        fetchUserSettings(),
        fetchWeeklyTotals(currentWeekStart)
      ])

      setSettings(settingsData)
      setTotals(totalsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  function handlePrevWeek() {
    setCurrentWeekStart(prev => addDays(prev, -7))
  }

  function handleNextWeek() {
    setCurrentWeekStart(prev => addDays(prev, 7))
  }

  function handleCurrentWeek() {
    setCurrentWeekStart(getLocalDate(getMondayOfWeek(new Date())))
  }

  // Calculate days elapsed and remaining
  const today = getLocalDate()
  const weekEnd = addDays(currentWeekStart, 6)
  const weekStartDate = new Date(currentWeekStart + 'T00:00:00')
  const weekEndDate = new Date(weekEnd + 'T00:00:00')
  const todayDate = new Date(today + 'T00:00:00')

  let daysElapsed = 0
  let daysRemaining = 7

  if (todayDate >= weekStartDate && todayDate <= weekEndDate) {
    // Current week
    daysElapsed = Math.floor((todayDate.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    daysRemaining = 7 - daysElapsed
  } else if (todayDate > weekEndDate) {
    // Past week
    daysElapsed = 7
    daysRemaining = 0
  }

  const expected = settings ? calculateExpectedMacros(settings) : null
  const weeklyExpected = expected ? {
    calories: expected.calories * 7,
    protein_g: expected.protein_g * 7,
    carbs_g: expected.carbs_g * 7,
    fat_g: expected.fat_g * 7
  } : null

  const rebalanceCalories = (totals && expected && daysRemaining > 0)
    ? calculateWeeklyRebalance(totals.calories, expected.calories * 7, daysElapsed, daysRemaining)
    : 0

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">📊 Weekly Summary</h1>
            <div className="flex gap-2">
              <Link
                to="/"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Daily View"
              >
                <Home className="w-5 h-5" />
              </Link>
              <Link
                to="/settings"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevWeek}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleCurrentWeek}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span className="font-medium">
                {formatDate(currentWeekStart)} - {formatDate(weekEnd)}
              </span>
            </button>

            <button
              onClick={handleNextWeek}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Weekly Totals Summary */}
      {totals && weeklyExpected && (
        <MacrosSummary actual={totals} expected={weeklyExpected} />
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Progress Info */}
        {daysElapsed > 0 && (
          <div className="bg-white dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-semibold mb-4">Week Progress</h2>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {daysElapsed}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Days Completed
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                  {daysRemaining}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Days Remaining
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rebalance Card */}
        {daysRemaining > 0 && totals && expected && (
          <div className="bg-white dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-semibold mb-4">Daily Adjustment</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              To stay on track with your weekly goal, adjust your daily target for the remaining {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}:
            </p>

            <div className="text-center p-6 bg-gray-50 dark:bg-zinc-900 rounded-lg">
              <div className={`text-4xl font-bold ${
                rebalanceCalories < 0
                  ? 'text-red-600 dark:text-red-400'
                  : rebalanceCalories > 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {rebalanceCalories > 0 ? '+' : ''}{rebalanceCalories} cal/day
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {rebalanceCalories < 0 && 'Reduce your daily intake'}
                {rebalanceCalories > 0 && 'Increase your daily intake'}
                {rebalanceCalories === 0 && 'You\'re perfectly on track!'}
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
              New daily target: {expected.calories + rebalanceCalories} cal
            </div>
          </div>
        )}

        {/* Past Week Message */}
        {daysRemaining === 0 && (
          <div className="bg-white dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-800 p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              This week is complete. Use the navigation to view other weeks.
            </p>
          </div>
        )}
      </main>

      {/* Onboarding Modal */}
      {!loading && !settings && (
        <Onboarding onComplete={loadData} />
      )}
    </div>
  )
}
