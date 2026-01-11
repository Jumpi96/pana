import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon, X, Check, ArrowRight } from 'lucide-react'
import { getLocalDate, addDays } from '../lib/utils'
import type { MealGroup } from '../types'

interface Props {
    sourceGroup: MealGroup
    itemCount: number
    onConfirm: (date: string, group: MealGroup) => Promise<void>
    onCancel: () => void
}

const mealGroups: { value: MealGroup; label: string }[] = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'snack', label: 'Snack' },
    { value: 'dinner', label: 'Dinner' },
]

export function CopyMealGroupModal({ sourceGroup, itemCount, onConfirm, onCancel }: Props) {
    const [date, setDate] = useState(getLocalDate())
    const [group, setGroup] = useState<MealGroup>(sourceGroup)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            await onConfirm(date, group)
        } finally {
            setIsSubmitting(false)
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-4 border-black dark:border-zinc-700">

                {/* Header */}
                <div className="px-6 py-5 bg-yellow-400 dark:bg-yellow-500/20 border-b-4 border-black dark:border-zinc-700 flex items-center justify-between">
                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-black dark:text-yellow-400">
                        Copy Meal Group
                    </h2>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-black/10 rounded-xl transition-colors active:scale-90"
                    >
                        <X className="w-5 h-5 text-black dark:text-yellow-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border-2 border-gray-100 dark:border-zinc-800">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Copying</p>
                        <p className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-xs font-black">
                                {itemCount}
                            </span>
                            items from <span className="capitalize text-yellow-600 dark:text-yellow-400 underline decoration-2 underline-offset-2">{sourceGroup}</span>
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">
                                Destination Date
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full h-14 pl-12 pr-4 bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-black dark:focus:border-yellow-400 rounded-2xl outline-none font-bold text-lg dark:text-white transition-all hover:bg-white dark:hover:bg-zinc-800"
                                    required
                                />
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDate(getLocalDate())}
                                    className="flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDate(addDays(getLocalDate(), 1))}
                                    className="flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    Tomorrow
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">
                                Destination Group
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {mealGroups.map((g) => (
                                    <button
                                        key={g.value}
                                        type="button"
                                        onClick={() => setGroup(g.value)}
                                        className={`
                      relative p-3 rounded-2xl border-2 text-left transition-all active:scale-95
                      ${group === g.value
                                                ? 'border-black dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-400/10 text-black dark:text-yellow-400 shadow-sm'
                                                : 'border-transparent bg-gray-50 dark:bg-zinc-800/50 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
                                            }
                    `}
                                    >
                                        <span className="block text-sm font-bold">{g.label}</span>
                                        {group === g.value && (
                                            <Check className="absolute top-3 right-3 w-4 h-4" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-14 bg-black dark:bg-yellow-400 text-white dark:text-black rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-lg"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Copy Meals <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
