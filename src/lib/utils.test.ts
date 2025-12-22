import { describe, it, expect } from 'vitest'
import { formatDate, getLocalDate, getMondayOfWeek, addDays, cn } from './utils'

describe('formatDate', () => {
  it('should format a date string in friendly format', () => {
    const formatted = formatDate('2024-01-15')
    expect(formatted).toMatch(/Mon, Jan 15/)
  })

  it('should handle different dates', () => {
    const formatted = formatDate('2024-12-25')
    expect(formatted).toMatch(/Wed, Dec 25/)
  })
})

describe('getLocalDate', () => {
  it('should return date in YYYY-MM-DD format', () => {
    const date = new Date('2024-06-15T14:30:00')
    const result = getLocalDate(date)
    expect(result).toBe('2024-06-15')
  })

  it('should pad single digit months and days', () => {
    const date = new Date('2024-01-05T00:00:00')
    const result = getLocalDate(date)
    expect(result).toBe('2024-01-05')
  })

  it('should use current date when no argument provided', () => {
    const result = getLocalDate()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('getMondayOfWeek', () => {
  it('should return the same date if already Monday', () => {
    const monday = new Date('2024-01-15') // This is a Monday
    const result = getMondayOfWeek(monday)
    expect(result.getDate()).toBe(15)
  })

  it('should return previous Monday for mid-week dates', () => {
    const wednesday = new Date('2024-01-17') // Wednesday
    const result = getMondayOfWeek(wednesday)
    expect(result.getDate()).toBe(15) // Monday the 15th
  })

  it('should handle Sunday correctly (return previous Monday)', () => {
    const sunday = new Date('2024-01-21') // Sunday
    const result = getMondayOfWeek(sunday)
    expect(result.getDate()).toBe(15) // Monday the 15th
  })

  it('should handle month boundaries', () => {
    const firstOfMonth = new Date('2024-02-01') // Thursday
    const result = getMondayOfWeek(firstOfMonth)
    expect(result.getMonth()).toBe(0) // January
    expect(result.getDate()).toBe(29) // Monday Jan 29
  })
})

describe('addDays', () => {
  it('should add positive days', () => {
    const result = addDays('2024-01-15', 7)
    expect(result).toBe('2024-01-22')
  })

  it('should subtract negative days', () => {
    const result = addDays('2024-01-15', -7)
    expect(result).toBe('2024-01-08')
  })

  it('should handle month boundaries', () => {
    const result = addDays('2024-01-30', 5)
    expect(result).toBe('2024-02-04')
  })

  it('should handle year boundaries', () => {
    const result = addDays('2023-12-30', 5)
    expect(result).toBe('2024-01-04')
  })

  it('should handle leap years', () => {
    const result = addDays('2024-02-28', 1)
    expect(result).toBe('2024-02-29')
  })

  it('should return same date when adding 0 days', () => {
    const result = addDays('2024-01-15', 0)
    expect(result).toBe('2024-01-15')
  })
})

describe('cn', () => {
  it('should merge class names', () => {
    const result = cn('text-red-500', 'bg-blue-500')
    expect(result).toContain('text-red-500')
    expect(result).toContain('bg-blue-500')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toContain('base-class')
    expect(result).toContain('active-class')
  })

  it('should filter out false values', () => {
    const isActive = false
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toContain('base-class')
    expect(result).not.toContain('active-class')
  })

  it('should handle Tailwind conflicts correctly', () => {
    const result = cn('p-4', 'p-2')
    // tailwind-merge should keep only the last conflicting class
    expect(result).toBe('p-2')
  })
})
