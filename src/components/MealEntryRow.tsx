import { useState } from 'react'
import { Trash2, Edit2, Check, X, AlertCircle } from 'lucide-react'
import { updatePortionLevel, deleteMealEntry, estimateMeal, updateMealEntry, updateMealEmbedding, updateMealQuantity } from '../lib/api'
import { calculateMealMacros, canEditQuantity } from '../lib/macros'
import { UNIT_LABELS } from '../lib/units'
import type { MealEntry, PortionLevel } from '../types'
import { cn } from '../lib/utils'

interface Props {
  meal: MealEntry
  onUpdate: () => void
  isOnline: boolean
}

export function MealEntryRow({ meal, onUpdate, isOnline }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedDescription, setEditedDescription] = useState(meal.description)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditingQuantity, setIsEditingQuantity] = useState(false)
  const [editedQuantity, setEditedQuantity] = useState(meal.quantity.toString())
  const [isSavingQuantity, setIsSavingQuantity] = useState(false)

  const macros = calculateMealMacros(meal)
  const quantityEditable = canEditQuantity(meal)

  async function handlePortionChange(level: PortionLevel) {
    try {
      await updatePortionLevel(meal.id, level)
      onUpdate()
    } catch (error) {
      console.error('Failed to update portion:', error)
      alert('Failed to update portion')
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this meal?')) return

    try {
      setIsDeleting(true)
      await deleteMealEntry(meal.id)
      onUpdate()
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('Failed to delete meal')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleSaveEdit() {
    if (!isOnline) return
    if (editedDescription.trim().length === 0) {
      alert('Description cannot be empty')
      return
    }
    if (editedDescription.length > 140) {
      alert('Description must be 140 characters or less')
      return
    }

    try {
      setIsSaving(true)

      // Re-estimate with new description
      const estimate = await estimateMeal(editedDescription.trim())

      // Use the first item from the estimate (editing doesn't support multi-item)
      const item = estimate.items[0]

      // Update meal entry with the new estimation
      await updateMealEntry(meal.id, {
        description: item.context_note
          ? `${item.normalized_name} (${item.context_note})`
          : item.normalized_name,
        quantity: item.quantity,
        unit: item.unit,
        calories_min: item.calories_min,
        calories_max: item.calories_max,
        protein_g_min: item.protein_g_min,
        protein_g_max: item.protein_g_max,
        carbs_g_min: item.carbs_g_min,
        carbs_g_max: item.carbs_g_max,
        fat_g_min: item.fat_g_min,
        fat_g_max: item.fat_g_max,
        alcohol_g: item.alcohol_g,
        alcohol_calories: item.alcohol_calories,
        base_calories_min: item.base_calories_min,
        base_calories_max: item.base_calories_max,
        base_protein_g_min: item.base_protein_g_min,
        base_protein_g_max: item.base_protein_g_max,
        base_carbs_g_min: item.base_carbs_g_min,
        base_carbs_g_max: item.base_carbs_g_max,
        base_fat_g_min: item.base_fat_g_min,
        base_fat_g_max: item.base_fat_g_max,
        base_alcohol_g: item.base_alcohol_g,
        base_alcohol_calories: item.base_alcohol_calories,
        uncertainty: item.uncertainty,
        last_estimated_at: new Date().toISOString()
      })

      // Update embedding asynchronously
      updateMealEmbedding(meal.id, item.normalized_name).catch(err => {
        console.error('Failed to update embedding:', err)
      })

      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to save edit:', error)
      alert('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancelEdit() {
    setEditedDescription(meal.description)
    setIsEditing(false)
  }

  async function handleSaveQuantity() {
    if (!isOnline) return

    const newQuantity = parseFloat(editedQuantity)
    if (isNaN(newQuantity) || newQuantity <= 0) {
      alert('Please enter a valid quantity greater than 0')
      return
    }

    try {
      setIsSavingQuantity(true)
      await updateMealQuantity(meal.id, newQuantity)
      setIsEditingQuantity(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to update quantity:', error)
      alert('Failed to update quantity')
    } finally {
      setIsSavingQuantity(false)
    }
  }

  function handleCancelQuantityEdit() {
    setEditedQuantity(meal.quantity.toString())
    setIsEditingQuantity(false)
  }

  return (
    <div className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="mb-2 relative">
              <textarea
                value={editedDescription}
                onChange={e => setEditedDescription(e.target.value)}
                maxLength={140}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-green-300 dark:border-green-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-green-500 outline-none resize-none text-sm"
                disabled={isSaving}
                autoFocus
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {editedDescription.length}/140
              </div>
            </div>
          ) : (
            <p className="text-sm font-medium mb-2 break-words">{meal.description}</p>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div className="flex gap-4">
              <span>{macros.calories.toFixed(0)} cal</span>
              <span>P: {macros.protein_g.toFixed(0)}g</span>
              <span>C: {macros.carbs_g.toFixed(0)}g</span>
              <span>F: {macros.fat_g.toFixed(0)}g</span>
            </div>

            {meal.alcohol_calories > 0 && (
              <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                <span>🍷 {meal.alcohol_calories.toFixed(0)} cal from alcohol ({meal.alcohol_g.toFixed(1)}g)</span>
              </div>
            )}

            {meal.uncertainty && (
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3 h-3" />
                <span>Uncertain estimate</span>
              </div>
            )}
          </div>

          {/* Quantity Editor - shown when not editing description and quantity is editable */}
          {!isEditing && quantityEditable && (
            <div className="mt-2">
              {isEditingQuantity ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editedQuantity}
                    onChange={e => setEditedQuantity(e.target.value)}
                    min="0.1"
                    step="0.1"
                    className="w-20 px-2 py-1 text-sm border rounded-lg border-green-300 dark:border-green-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-green-500 outline-none"
                    disabled={isSavingQuantity}
                    autoFocus
                  />
                  <span className="text-xs text-gray-500">{UNIT_LABELS[meal.unit]}</span>
                  <button
                    onClick={handleSaveQuantity}
                    disabled={isSavingQuantity}
                    className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 transition-colors disabled:opacity-50"
                    title="Save quantity"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelQuantityEdit}
                    disabled={isSavingQuantity}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditedQuantity(meal.quantity.toString())
                    setIsEditingQuantity(true)
                  }}
                  disabled={!isOnline}
                  className="text-xs text-gray-500 hover:text-green-600 dark:hover:text-green-400 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Edit quantity"
                >
                  <span>{meal.quantity} {UNIT_LABELS[meal.unit]}</span>
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Portion Level Buttons - hidden when editing */}
          {!isEditing && (
            <div className="flex gap-2 mt-3">
              {[
                { level: 'light', emoji: '🍃', label: 'Light', color: 'hover:bg-green-100 dark:hover:bg-green-900/30' },
                { level: 'ok', emoji: '✅', label: 'Ok', color: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30' },
                { level: 'heavy', emoji: '🍕', label: 'Heavy', color: 'hover:bg-red-100 dark:hover:bg-red-900/30' }
              ].map(({ level, emoji, label, color }) => (
                <button
                  key={level}
                  onClick={() => handlePortionChange(level as PortionLevel)}
                  disabled={!isOnline}
                  title={label}
                  className={cn(
                    'p-2 rounded-xl text-lg transition-all duration-200 transform hover:scale-110 active:scale-95 border-2',
                    meal.portion_level === level
                      ? 'bg-white dark:bg-zinc-800 border-green-500 shadow-md ring-2 ring-green-500/20'
                      : 'bg-gray-50 dark:bg-zinc-900/50 border-transparent ' + color,
                    !isOnline && 'opacity-50 cursor-not-allowed grayscale'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{emoji}</span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 group-hover:text-gray-600">
                      {label}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Save (will re-estimate)"
              >
                <Check className="w-4 h-4" />
              </button>

              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                disabled={!isOnline}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleDelete}
                disabled={!isOnline || isDeleting}
                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
