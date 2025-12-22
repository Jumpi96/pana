import { useState, useEffect, useRef } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { insertMealEntry, estimateMeal, searchSimilarMeals, updateMealEmbedding } from '../lib/api'
import type { MealGroup, SimilarMeal } from '../types'
import { useDebounce } from '../hooks/useDebounce'

interface Props {
  mealGroup: MealGroup
  date: string
  position: number
  onSave: () => void
  onCancel: () => void
}

export function AddMealForm({ mealGroup, date, position, onSave, onCancel }: Props) {
  const [description, setDescription] = useState('')
  const [isEstimating, setIsEstimating] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<SimilarMeal[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const debouncedDescription = useDebounce(description, 300)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (debouncedDescription.trim().length >= 3) {
      loadSuggestions(debouncedDescription)
    } else {
      setSuggestions([])
    }
  }, [debouncedDescription])

  async function loadSuggestions(query: string) {
    try {
      const results = await searchSimilarMeals(query, 5)
      setSuggestions(results)
      setShowSuggestions(true)
    } catch (err) {
      console.error('Failed to load suggestions:', err)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setShowSuggestions(false) // Close suggestions on submit

    if (description.trim().length === 0) {
      setError('Description is required')
      return
    }

    if (description.length > 140) {
      setError('Description must be 140 characters or less')
      return
    }

    try {
      setError('')
      setIsEstimating(true)

      const estimate = await estimateMeal(description)

      const entry = await insertMealEntry({
        date_local: date,
        meal_group: mealGroup,
        position,
        description: description.trim(),
        ...estimate,
        portion_level: 'ok',
        last_estimated_at: new Date().toISOString()
      })

      // Update embedding asynchronously (non-blocking)
      updateMealEmbedding(entry.id, description.trim()).catch(err => {
        console.error('Failed to update embedding:', err)
      })

      onSave()
    } catch (err) {
      console.error('Failed to save meal:', err)
      setError(err instanceof Error ? err.message : 'Failed to estimate meal')
    } finally {
      setIsEstimating(false)
    }
  }

  async function handleSelectSuggestion(suggestion: SimilarMeal) {
    try {
      setError('')
      setIsEstimating(true)
      setShowSuggestions(false)

      const entry = await insertMealEntry({
        date_local: date,
        meal_group: mealGroup,
        position,
        description: suggestion.description,
        calories_min: suggestion.calories_min,
        calories_max: suggestion.calories_max,
        protein_g_min: suggestion.protein_g_min,
        protein_g_max: suggestion.protein_g_max,
        carbs_g_min: suggestion.carbs_g_min,
        carbs_g_max: suggestion.carbs_g_max,
        fat_g_min: suggestion.fat_g_min,
        fat_g_max: suggestion.fat_g_max,
        alcohol_g: suggestion.alcohol_g,
        alcohol_calories: suggestion.alcohol_calories,
        uncertainty: suggestion.uncertainty,
        portion_level: 'ok',
        last_estimated_at: new Date().toISOString()
      })

      // Update embedding
      updateMealEmbedding(entry.id, suggestion.description).catch(err => {
        console.error('Failed to update embedding:', err)
      })

      onSave()
    } catch (err) {
      console.error('Failed to save meal:', err)
      setError(err instanceof Error ? err.message : 'Failed to save meal')
    } finally {
      setIsEstimating(false)
    }
  }

  return (
    <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-900/50">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={description}
            onChange={e => setDescription(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                setShowSuggestions(false)
              }
            }}
            placeholder="Describe your meal (e.g., 2 eggs and toast)..."
            maxLength={140}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-green-500 outline-none resize-none"
            disabled={isEstimating}
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {description.length}/140
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border-b border-gray-200 dark:border-zinc-800 last:border-b-0"
                >
                  <div className="text-sm font-medium">{suggestion.description}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {Math.round((suggestion.calories_min + suggestion.calories_max) / 2)} cal
                    • {(suggestion.similarity * 100).toFixed(0)}% match
                    • {new Date(suggestion.date_local).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add margin when suggestions are showing to prevent overlap */}
        <div style={{ marginTop: showSuggestions && suggestions.length > 0 ? '260px' : undefined }} />

        {error && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isEstimating || description.trim().length === 0}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isEstimating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Estimating...
              </>
            ) : (
              'Add Meal'
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={isEstimating}
            className="px-4 py-2 bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
