import { useState } from 'react'
import { Plus } from 'lucide-react'
import { MealEntryRow } from './MealEntryRow'
import { AddMealForm } from './AddMealForm'
import type { MealGroup, MealEntry } from '../types'

interface Props {
  mealGroup: MealGroup
  date: string
  meals: MealEntry[]
  onMealsChange: () => void
  isOnline: boolean
}

const groupLabels: Record<MealGroup, string> = {
  breakfast: '🌅 Breakfast',
  lunch: '☀️ Lunch',
  snack: '🍎 Snack',
  dinner: '🌙 Dinner'
}

export function MealGroupSection({ mealGroup, date, meals, onMealsChange, isOnline }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{groupLabels[mealGroup]}</h2>
        <button
          onClick={() => setShowAddForm(true)}
          disabled={!isOnline}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-zinc-800">
        {meals.map(meal => (
          <MealEntryRow
            key={meal.id}
            meal={meal}
            onUpdate={onMealsChange}
            isOnline={isOnline}
          />
        ))}

        {showAddForm && (
          <AddMealForm
            mealGroup={mealGroup}
            date={date}
            position={meals.length}
            onSave={() => {
              setShowAddForm(false)
              onMealsChange()
            }}
            onCancel={() => setShowAddForm(false)}
          />
        )}
      </div>

      {meals.length === 0 && !showAddForm && (
        <div className="px-6 py-8 text-center text-gray-400 text-sm">
          No meals logged yet
        </div>
      )}
    </div>
  )
}
