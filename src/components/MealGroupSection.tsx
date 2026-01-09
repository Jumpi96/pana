import { useState } from 'react'
import { Plus, Copy } from 'lucide-react'
import { MealEntryRow } from './MealEntryRow'
import { AddMealForm } from './AddMealForm'
import { CopyMealGroupModal } from './CopyMealGroupModal'
import { cn } from '../lib/utils'
import { copyMealGroup } from '../lib/api'
import type { MealGroup, MealEntry } from '../types'

interface Props {
  mealGroup: MealGroup
  date: string
  meals: MealEntry[]
  onMealsChange: () => void
  isOnline: boolean
  isRefreshing: boolean
}

const groupLabels: Record<MealGroup, string> = {
  breakfast: '🌅 Breakfast!',
  lunch: '☀️ Lunch Time!',
  snack: '🍎 Snack Attack!',
  dinner: '🌙 Dinner Night!'
}

export function MealGroupSection({ mealGroup, date, meals, onMealsChange, isOnline, isRefreshing }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)

  const handleCopy = async (targetDate: string, targetGroup: MealGroup) => {
    try {
      await copyMealGroup(meals, targetDate, targetGroup)
      setShowCopyModal(false)
      // If we copied to the same day, refresh the list
      if (targetDate === date) {
        onMealsChange()
      }
    } catch (error) {
      console.error('Failed to copy meals:', error)
      alert('Failed to copy meals. Please try again.')
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-2xl border-[3px] border-black dark:border-zinc-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.05)] transition-all hover:scale-[1.005] z-0">
      <div className="px-6 py-4 border-b-[3px] border-black dark:border-zinc-800 flex items-center justify-between bg-green-50 dark:bg-green-900/10 rounded-t-[13px]">
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-black dark:text-white">
          {groupLabels[mealGroup]}
        </h2>
        <div className="flex gap-2">
          {meals.length > 0 && (
            <button
              onClick={() => setShowCopyModal(true)}
              disabled={!isOnline || isRefreshing}
              className="p-2 bg-white dark:bg-zinc-800 text-black dark:text-white rounded-xl hover:scale-105 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border-2 border-transparent hover:border-black dark:hover:border-white"
              title="Copy meal group"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            disabled={!isOnline || isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:scale-105 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(34,197,94,1)]"
          >
            <Plus className="w-4 h-4" />
            Add Meal
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-zinc-800 relative">
        {showCopyModal && (
          <CopyMealGroupModal
            sourceGroup={mealGroup}
            itemCount={meals.length}
            onConfirm={handleCopy}
            onCancel={() => setShowCopyModal(false)}
          />
        )}

        {showAddForm && (
          <div className="relative z-40">
            <AddMealForm
              mealGroup={mealGroup}
              date={date}
              position={meals.length > 0 ? Math.min(...meals.map(m => m.position)) - 1 : 0}
              onSave={() => {
                setShowAddForm(false)
                onMealsChange()
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {meals.map((meal, index) => (
          <div key={meal.id} className={cn(
            "relative",
            index === meals.length - 1 && !showAddForm && "rounded-b-[13px] overflow-hidden"
          )}>
            <MealEntryRow
              meal={meal}
              onUpdate={onMealsChange}
              isOnline={isOnline}
            />
          </div>
        ))}
      </div>

      {meals.length === 0 && !showAddForm && (
        <div className="px-6 py-8 text-center text-gray-400 text-sm italic font-medium">
          No meals logged yet... Feed the beast! 🦁
        </div>
      )}
    </div>
  )
}
