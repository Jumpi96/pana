import { openDB, type IDBPDatabase } from 'idb'
import type { UserSettings, MealEntry, DailyTotals } from '../../types'

const DB_NAME = 'pana-offline'
const DB_VERSION = 1

export interface PanaDB {
    user_settings: {
        key: string
        value: UserSettings
    }
    meal_entries: {
        key: string
        value: MealEntry
        indexes: { 'by-date': string }
    }
    daily_totals: {
        key: string
        value: DailyTotals
    }
    weekly_totals: {
        key: string
        value: DailyTotals
    }
}

let dbPromise: Promise<IDBPDatabase<PanaDB>> | null = null

export function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<PanaDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                db.createObjectStore('user_settings')
                const mealStore = db.createObjectStore('meal_entries', { keyPath: 'id' })
                mealStore.createIndex('by-date', 'date_local')
                db.createObjectStore('daily_totals')
                db.createObjectStore('weekly_totals')
            },
        })
    }
    return dbPromise
}

// User Settings
export async function saveCachedSettings(settings: UserSettings) {
    const db = await getDB()
    await db.put('user_settings', settings, settings.user_id)
}

export async function getCachedSettings(userId: string): Promise<UserSettings | null> {
    const db = await getDB()
    return (await db.get('user_settings', userId)) || null
}

// Meal Entries
export async function saveCachedMeals(meals: MealEntry[]) {
    const db = await getDB()
    const tx = db.transaction('meal_entries', 'readwrite')
    await Promise.all([
        ...meals.map(meal => tx.store.put(meal)),
        tx.done
    ])
}

export async function getCachedMeals(dateLocal: string): Promise<MealEntry[]> {
    const db = await getDB()
    return await db.getAllFromIndex('meal_entries', 'by-date', dateLocal)
}

// Daily Totals
export async function saveCachedDailyTotals(dateLocal: string, totals: DailyTotals) {
    const db = await getDB()
    await db.put('daily_totals', totals, dateLocal)
}

export async function getCachedDailyTotals(dateLocal: string): Promise<DailyTotals | null> {
    const db = await getDB()
    return (await db.get('daily_totals', dateLocal)) || null
}

// Weekly Totals
export async function saveCachedWeeklyTotals(weekStartDate: string, totals: DailyTotals) {
    const db = await getDB()
    await db.put('weekly_totals', totals, weekStartDate)
}

export async function getCachedWeeklyTotals(weekStartDate: string): Promise<DailyTotals | null> {
    const db = await getDB()
    return (await db.get('weekly_totals', weekStartDate)) || null
}
