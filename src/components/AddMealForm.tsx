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
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
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
      setIsLoadingSuggestions(true)
      const results = await searchSimilarMeals(query, 10) // Fetch more to allow for filtering

      // Keep only distinct descriptions, taking the first (latest) occurrence
      const distinct = results.reduce((acc: SimilarMeal[], curr) => {
        if (!acc.find(s => s.description.toLowerCase() === curr.description.toLowerCase())) {
          acc.push(curr)
        }
        return acc
      }, []).slice(0, 5) // Limit back to 5 after deduplication

      setSuggestions(distinct)
      setShowSuggestions(true)
    } catch (err) {
      console.error('Failed to load suggestions:', err)
    } finally {
      setIsLoadingSuggestions(false)
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
        <div className="flex gap-2 items-start">
          <div className="relative flex-1">
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
              placeholder="What did you eat?"
              maxLength={140}
              rows={1}
              className="w-full px-4 py-3 rounded-xl border-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-green-500 outline-none resize-none font-medium h-[52px] transition-all"
              disabled={isEstimating}
            />
            <div className="absolute top-1/2 -translate-y-1/2 right-3 text-[10px] font-black text-gray-300 pointer-events-none">
              {description.length}/140
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && (suggestions.length > 0 || isLoadingSuggestions) && (
              <div className="absolute z-[100] w-full mt-3 bg-white dark:bg-zinc-950 border-[3px] border-black dark:border-zinc-700 rounded-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] dark:shadow-[10px_10px_0px_0px_rgba(255,255,255,0.05)] max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {isLoadingSuggestions ? (
                  <div className="flex items-center justify-center p-8 text-green-600">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  suggestions.map(suggestion => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors border-b-2 border-gray-100 dark:border-zinc-800 last:border-b-0 group"
                    >
                      <div className="text-sm font-black text-black dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400 tracking-tight">
                        {suggestion.description}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 font-bold uppercase tracking-tighter">
                        <span className="bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                          {Math.round((suggestion.calories_min + suggestion.calories_max) / 2 + suggestion.alcohol_calories)} cal
                          {suggestion.alcohol_calories > 0 && <span className="ml-1 text-purple-600 dark:text-purple-400">🍷</span>}
                        </span>
                        <span>•</span>
                        <span>{new Date(suggestion.date_local).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isEstimating || description.trim().length === 0}
            className="h-[52px] px-6 bg-black dark:bg-white text-white dark:text-black rounded-xl font-black uppercase tracking-widest hover:scale-105 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(34,197,94,1)] flex items-center justify-center whitespace-nowrap"
          >
            {isEstimating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Add It!'
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold uppercase py-1">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isEstimating}
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            Wait, nevermind
          </button>
        </div>
      </form>
    </div>
  )
}
