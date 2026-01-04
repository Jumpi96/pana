import type { MealUnit } from '../types'

// Short labels for display
export const UNIT_LABELS: Record<MealUnit, string> = {
  portion: 'portion',
  g: 'g',
  ml: 'ml',
  spoon: 'tbsp',
  piece: 'pc',
  cup: 'cup'
}

// Full labels for tooltips/accessibility
export const UNIT_LABELS_FULL: Record<MealUnit, string> = {
  portion: 'portion',
  g: 'grams',
  ml: 'milliliters',
  spoon: 'tablespoon',
  piece: 'piece',
  cup: 'cup'
}

// Format quantity with unit for display
// Returns empty string for default "1 portion" (implicit)
export function formatQuantity(quantity: number, unit: MealUnit): string {
  if (quantity === 1 && unit === 'portion') return ''
  return `${quantity}${UNIT_LABELS[unit]}`
}

// Format quantity with unit for display (always show, even for 1 portion)
export function formatQuantityFull(quantity: number, unit: MealUnit): string {
  return `${quantity} ${UNIT_LABELS[unit]}`
}
