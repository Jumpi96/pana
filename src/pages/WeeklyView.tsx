import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar, Home, Settings as SettingsIcon, Loader2 } from 'lucide-react'
import { getLocalDate, getMondayOfWeek, addDays, formatDate } from '../lib/utils'
import { fetchDailyTotals, fetchUserSettings, fetchWeeklyTotals } from '../lib/api'
import { calculateCompletedDayAverageDelta, calculateExpectedMacros, calculateWeeklyRebalance } from '../lib/macros'
import { MacrosSummary } from '../components/MacrosSummary'
import { Onboarding } from '../components/Onboarding'
import type { UserSettings, DailyTotals } from '../types'

export function WeeklyView() {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    getLocalDate(getMondayOfWeek(new Date()))
  )
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [totals, setTotals] = useState<DailyTotals | null>(null)
  const [todayTotals, setTodayTotals] = useState<DailyTotals | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const todayLocal = getLocalDate()
      const todayDate = parseLocalDate(todayLocal)
      const weekStartDate = parseLocalDate(currentWeekStart)
      const weekEndDate = parseLocalDate(addDays(currentWeekStart, 6))
      const isTodayInWeek = todayDate >= weekStartDate && todayDate <= weekEndDate

      const [settingsData, totalsData, todayData] = await Promise.all([
        fetchUserSettings(),
        fetchWeeklyTotals(currentWeekStart),
        isTodayInWeek ? fetchDailyTotals(todayLocal) : Promise.resolve(null)
      ])

      setSettings(settingsData)
      setTotals(totalsData)
      setTodayTotals(todayData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }, [currentWeekStart])

  useEffect(() => {
    loadData()
  }, [loadData])

  function handlePrevWeek() {
    setCurrentWeekStart(prev => addDays(prev, -7))
  }

  function handleNextWeek() {
    setCurrentWeekStart(prev => addDays(prev, 7))
  }

  function handleCurrentWeek() {
    setCurrentWeekStart(getLocalDate(getMondayOfWeek(new Date())))
  }

  function parseLocalDate(dateStr: string) {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // Calculate days elapsed and remaining
  const today = getLocalDate()
  const weekEnd = addDays(currentWeekStart, 6)
  const weekStartDate = parseLocalDate(currentWeekStart)
  const weekEndDate = parseLocalDate(weekEnd)
  const todayDate = parseLocalDate(today)

  let daysElapsed = 0
  let daysRemaining = 7

  if (todayDate >= weekStartDate && todayDate <= weekEndDate) {
    // Current week - only count fully completed days, not the in-progress day
    daysElapsed = Math.floor((todayDate.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24))
    daysRemaining = 7 - daysElapsed
  } else if (todayDate > weekEndDate) {
    // Past week
    daysElapsed = 7
    daysRemaining = 0
  }

  const totalsCompleted = (() => {
    if (!totals) return null
    const isTodayInWeek = todayDate >= weekStartDate && todayDate <= weekEndDate
    if (!isTodayInWeek || !todayTotals) return totals

    return {
      calories: totals.calories - todayTotals.calories,
      protein_g: totals.protein_g - todayTotals.protein_g,
      carbs_g: totals.carbs_g - todayTotals.carbs_g,
      fat_g: totals.fat_g - todayTotals.fat_g
    }
  })()

  const expected = settings ? calculateExpectedMacros(settings) : null
  const weeklyExpected = expected ? {
    calories: expected.calories * 7,
    protein_g: expected.protein_g * 7,
    carbs_g: expected.carbs_g * 7,
    fat_g: expected.fat_g * 7
  } : null

  const rebalanceCalories = (totalsCompleted && expected && daysRemaining > 0)
    ? calculateWeeklyRebalance(totalsCompleted.calories, expected.calories * 7, daysElapsed, daysRemaining)
    : 0

  const macroAverages = totalsCompleted && expected && daysElapsed > 0
    ? {
        protein: calculateCompletedDayAverageDelta(totalsCompleted.protein_g, expected.protein_g, daysElapsed, 1),
        carbs: calculateCompletedDayAverageDelta(totalsCompleted.carbs_g, expected.carbs_g, daysElapsed, 1),
        fat: calculateCompletedDayAverageDelta(totalsCompleted.fat_g, expected.fat_g, daysElapsed, 1)
      }
    : null

  const macroTips = macroAverages
    ? [
        { label: 'Protein', value: macroAverages.protein, emoji: '🥩', msg: 'Focus on lean meats or shakes next time!' },
        { label: 'Carbs', value: macroAverages.carbs, emoji: '🍞', msg: 'Maybe swap the bread for some greens?' },
        { label: 'Fat', value: macroAverages.fat, emoji: '🥑', msg: 'Easy on the oils and butter today!' }
      ].filter(tip => tip.value > 2) // Only show if they are averaging significantly over the goal so far
    : []

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
      <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b-4 border-black dark:border-zinc-800 sticky top-0 z-30 transition-all">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={handleCurrentWeek}>
              <span className="text-3xl rotate-12 group-hover:rotate-0 transition-transform">📊</span>
              <h1 className="text-3xl font-black text-black dark:text-white tracking-tighter italic uppercase">
                Weekly<span className="text-green-500">!</span>
              </h1>
            </div>
            <div className="flex gap-2">
              <Link
                to="/"
                className="p-2.5 rounded-xl border-2 border-transparent hover:border-black dark:hover:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-all active:scale-90"
                title="Daily View"
              >
                <Home className="w-5 h-5" />
              </Link>
              <Link
                to="/settings"
                className="p-2.5 rounded-xl border-2 border-transparent hover:border-black dark:hover:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-all active:scale-90"
                title="Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-100 dark:bg-zinc-900 p-1.5 rounded-2xl border-2 border-black dark:border-zinc-800">
            <button
              onClick={handlePrevWeek}
              className="p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-all active:scale-90 shadow-sm border-2 border-transparent hover:border-black dark:hover:border-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleCurrentWeek}
              className="flex items-center gap-2 px-6 py-2 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-all active:scale-95 group"
            >
              <Calendar className="w-4 h-4 text-green-600 group-hover:scale-110 transition-transform" />
              <span className="font-black text-sm uppercase tracking-widest">
                {formatDate(currentWeekStart)} - {formatDate(weekEnd)}
              </span>
            </button>

            <button
              onClick={handleNextWeek}
              className="p-2 rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-all active:scale-90 shadow-sm border-2 border-transparent hover:border-black dark:hover:border-white"
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
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Rebalance Card */}
        {daysRemaining > 0 && totals && expected ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-950 rounded-3xl border-[3px] border-black dark:border-zinc-800 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.05)] transition-all hover:scale-[1.01]">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-3xl">⚖️</div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter italic">Daily Adjustment</h2>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded-full uppercase truncate">
                      {daysElapsed} Days Done
                    </span>
                    <span className="text-[10px] font-black bg-green-500 text-white px-2 py-0.5 rounded-full uppercase truncate">
                      {daysRemaining} Left
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                To stay on track with your weekly goal, adjust your daily target for the remaining {daysRemaining} days:
              </p>

              <div className="text-center p-10 bg-gray-50 dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-black/20 dark:border-white/20">
                <div className={`text-6xl font-black tracking-tighter italic mb-4 ${rebalanceCalories < 0
                  ? 'text-red-600 dark:text-red-400'
                  : rebalanceCalories > 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                  }`}>
                  {rebalanceCalories > 0 ? '+' : ''}{rebalanceCalories}
                  <span className="text-xl ml-2 uppercase not-italic">cal/day</span>
                </div>
                <div className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  {rebalanceCalories < 0 && '👇 Eat a bit less to compensate!'}
                  {rebalanceCalories > 0 && '🚀 You can eat a bit more!'}
                  {rebalanceCalories === 0 && '🎯 Perfection. No changes needed.'}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t-2 border-dashed border-black/10 dark:border-white/10 flex justify-between items-center text-xs font-black uppercase tracking-widest">
                <span className="text-gray-400">New Target:</span>
                <span className="text-black dark:text-white bg-yellow-400 px-3 py-1 rounded-lg">
                  {expected.calories + rebalanceCalories} Calories
                </span>
              </div>
            </div>

            {/* Macro Recommendations */}
            {macroTips.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-3xl border-[3px] border-yellow-400 p-8 shadow-[8px_8px_0px_0px_rgba(250,204,21,1)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="text-3xl">💡</div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter italic text-yellow-700 dark:text-yellow-400">Pana Tips!</h2>
                </div>

                <div className="space-y-4">
                  {macroTips.map(tip => (
                    <div key={tip.label} className="flex gap-4 p-4 bg-white dark:bg-zinc-950 rounded-2xl border-2 border-yellow-400 animate-in slide-in-from-left-2 duration-300">
                      <div className="text-2xl pt-1">{tip.emoji}</div>
                      <div>
                        <div className="text-sm font-black uppercase tracking-tighter italic text-red-600">
                          Too much {tip.label}!
                        </div>
                        <div className="text-xs font-bold text-gray-600 dark:text-gray-400 mt-1">
                          You are averaging <span className="text-black dark:text-white font-black">{Math.abs(tip.value).toFixed(1)}g</span> over your daily goal. {tip.msg}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : daysRemaining === 0 && totals && expected ? (
          <div className="space-y-8">
            <div className="bg-white dark:bg-zinc-950 rounded-3xl border-[4px] border-black dark:border-zinc-800 p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.05)] transition-all">
              <div className="text-center mb-10">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-3xl font-[900] uppercase tracking-tighter italic text-black dark:text-white">Week Wrapped!</h2>
                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-2">Here is your survival report 📝</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Calories', actual: totals.calories, expected: expected.calories * 7, unit: 'kcal/day', emoji: '🔥' },
                  { label: 'Protein', actual: totals.protein_g, expected: expected.protein_g * 7, unit: 'g/day', emoji: '🥩' },
                  { label: 'Carbs', actual: totals.carbs_g, expected: expected.carbs_g * 7, unit: 'g/day', emoji: '🍞' },
                  { label: 'Fat', actual: totals.fat_g, expected: expected.fat_g * 7, unit: 'g/day', emoji: '🥑' }
                ].map(item => {
                  const avgActual = item.actual / 7
                  const avgExpected = item.expected / 7
                  const diff = avgActual - avgExpected
                  const isOver = diff > (item.label === 'Calories' ? 50 : 2) // Small threshold

                  return (
                    <div key={item.label} className="p-6 bg-gray-50 dark:bg-zinc-900 rounded-2xl border-2 border-black dark:border-zinc-800 flex items-center justify-between group hover:scale-[1.02] transition-transform">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl group-hover:rotate-12 transition-transform">{item.emoji}</span>
                        <div>
                          <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{item.label}</div>
                          <div className={`text-sm font-black italic ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(item.label === 'Calories' ? 0 : 1)} {item.unit}
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-tighter bg-black text-white px-2 py-1 rounded-md">
                        AVG VS GOAL
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-10 pt-8 border-t-4 border-dashed border-black/10 dark:border-white/10 text-center">
                <button
                  onClick={handleCurrentWeek}
                  className="px-8 py-4 bg-green-500 text-white border-[3px] border-black rounded-2xl font-black uppercase italic tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                >
                  Crunch Next Week! 🚀
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Onboarding Modal */}
      {!loading && !settings && (
        <Onboarding onComplete={loadData} />
      )}
    </div>
  )
}
