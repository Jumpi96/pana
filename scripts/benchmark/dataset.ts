/**
 * Benchmark Test Cases
 *
 * ~20 test cases covering various scenarios:
 * - Simple single items with known macros
 * - Multi-item entries
 * - Spanish language entries
 * - Vague descriptions
 * - Explicit quantities
 * - Alcohol items
 */

import type { TestCase } from './types'

export const testCases: TestCase[] = [
  // === SIMPLE SINGLE ITEMS ===
  {
    id: 'simple-1',
    description: '2 eggs',
    category: 'simple',
    expected: {
      items: [{
        name: 'Eggs',
        quantity: 2,
        unit: 'piece',
        calories: { min: 140, max: 180 },
        protein_g: { min: 11, max: 14 },
        carbs_g: { min: 0, max: 2 },
        fat_g: { min: 9, max: 12 },
      }]
    }
  },
  {
    id: 'simple-2',
    description: '100g chicken breast',
    category: 'quantity',
    expected: {
      items: [{
        name: 'Chicken breast',
        quantity: 100,
        unit: 'g',
        calories: { min: 150, max: 180 },
        protein_g: { min: 28, max: 35 },
        carbs_g: { min: 0, max: 1 },
        fat_g: { min: 2, max: 5 },
      }]
    }
  },
  {
    id: 'simple-3',
    description: '1 banana',
    category: 'simple',
    expected: {
      items: [{
        name: 'Banana',
        quantity: 1,
        unit: 'piece',
        calories: { min: 90, max: 120 },
        protein_g: { min: 1, max: 2 },
        carbs_g: { min: 22, max: 30 },
        fat_g: { min: 0, max: 1 },
      }]
    }
  },
  {
    id: 'simple-4',
    description: '50g oatmeal',
    category: 'quantity',
    expected: {
      items: [{
        name: 'Oatmeal',
        quantity: 50,
        unit: 'g',
        calories: { min: 170, max: 210 },
        protein_g: { min: 5, max: 8 },
        carbs_g: { min: 28, max: 35 },
        fat_g: { min: 3, max: 5 },
      }]
    }
  },

  // === SPANISH ENTRIES ===
  {
    id: 'spanish-1',
    description: 'Una cucharada de miel',
    category: 'spanish',
    expected: {
      items: [{
        name: 'Miel',
        quantity: 1,
        unit: 'spoon',
        calories: { min: 55, max: 75 },
        protein_g: { min: 0, max: 1 },
        carbs_g: { min: 15, max: 21 },
        fat_g: { min: 0, max: 0 },
      }]
    }
  },
  {
    id: 'spanish-2',
    description: 'Dos huevos fritos',
    category: 'spanish',
    expected: {
      items: [{
        name: 'Huevos fritos',
        quantity: 2,
        unit: 'piece',
        calories: { min: 180, max: 240 },
        protein_g: { min: 11, max: 14 },
        carbs_g: { min: 0, max: 2 },
        fat_g: { min: 14, max: 20 },
      }]
    }
  },
  {
    id: 'spanish-3',
    description: '200ml de leche',
    category: 'spanish',
    expected: {
      items: [{
        name: 'Leche',
        quantity: 200,
        unit: 'ml',
        calories: { min: 80, max: 130 },
        protein_g: { min: 6, max: 8 },
        carbs_g: { min: 9, max: 12 },
        fat_g: { min: 3, max: 7 },
      }]
    }
  },

  // === MULTI-ITEM ENTRIES ===
  {
    id: 'multi-1',
    description: 'Toast with butter and jam',
    category: 'multi-item',
    expected: {
      items: [
        {
          name: 'Toast',
          quantity: 1,
          unit: 'piece',
          calories: { min: 60, max: 90 },
          protein_g: { min: 2, max: 4 },
          carbs_g: { min: 12, max: 18 },
          fat_g: { min: 0, max: 2 },
        },
        {
          name: 'Butter',
          quantity: 1,
          unit: 'portion',
          calories: { min: 70, max: 110 },
          protein_g: { min: 0, max: 1 },
          carbs_g: { min: 0, max: 1 },
          fat_g: { min: 8, max: 12 },
        },
        {
          name: 'Jam',
          quantity: 1,
          unit: 'portion',
          calories: { min: 40, max: 60 },
          protein_g: { min: 0, max: 1 },
          carbs_g: { min: 10, max: 15 },
          fat_g: { min: 0, max: 0 },
        }
      ]
    }
  },
  {
    id: 'multi-2',
    description: 'Arroz con pollo y ensalada',
    category: 'multi-item',
    expected: {
      items: [
        {
          name: 'Arroz',
          quantity: 1,
          unit: 'portion',
          calories: { min: 150, max: 250 },
          protein_g: { min: 3, max: 6 },
          carbs_g: { min: 35, max: 55 },
          fat_g: { min: 0, max: 2 },
        },
        {
          name: 'Pollo',
          quantity: 1,
          unit: 'portion',
          calories: { min: 150, max: 250 },
          protein_g: { min: 25, max: 40 },
          carbs_g: { min: 0, max: 2 },
          fat_g: { min: 4, max: 12 },
        },
        {
          name: 'Ensalada',
          quantity: 1,
          unit: 'portion',
          calories: { min: 30, max: 80 },
          protein_g: { min: 1, max: 3 },
          carbs_g: { min: 4, max: 10 },
          fat_g: { min: 0, max: 5 },
        }
      ]
    }
  },
  {
    id: 'multi-3',
    description: 'Dos presas de pollo, un poco de ensalada',
    category: 'multi-item',
    expected: {
      items: [
        {
          name: 'Presas de pollo',
          quantity: 2,
          unit: 'piece',
          calories: { min: 280, max: 400 },
          protein_g: { min: 35, max: 55 },
          carbs_g: { min: 0, max: 3 },
          fat_g: { min: 12, max: 24 },
        },
        {
          name: 'Ensalada',
          quantity: 1,
          unit: 'portion',
          calories: { min: 20, max: 60 },
          protein_g: { min: 1, max: 3 },
          carbs_g: { min: 3, max: 8 },
          fat_g: { min: 0, max: 4 },
        }
      ]
    }
  },
  {
    id: 'multi-4',
    description: 'Crackers con queso',
    category: 'multi-item',
    expected: {
      items: [
        {
          name: 'Crackers',
          quantity: 1,
          unit: 'portion',
          calories: { min: 80, max: 140 },
          protein_g: { min: 1, max: 3 },
          carbs_g: { min: 14, max: 22 },
          fat_g: { min: 2, max: 6 },
        },
        {
          name: 'Queso',
          quantity: 1,
          unit: 'portion',
          calories: { min: 80, max: 130 },
          protein_g: { min: 5, max: 8 },
          carbs_g: { min: 0, max: 2 },
          fat_g: { min: 6, max: 10 },
        }
      ]
    }
  },

  // === QUANTITY ENTRIES ===
  {
    id: 'quantity-1',
    description: '50g crackers',
    category: 'quantity',
    expected: {
      items: [{
        name: 'Crackers',
        quantity: 50,
        unit: 'g',
        calories: { min: 190, max: 250 },
        protein_g: { min: 4, max: 7 },
        carbs_g: { min: 30, max: 42 },
        fat_g: { min: 6, max: 11 },
      }]
    }
  },
  {
    id: 'quantity-2',
    description: '250ml milk',
    category: 'quantity',
    expected: {
      items: [{
        name: 'Milk',
        quantity: 250,
        unit: 'ml',
        calories: { min: 100, max: 160 },
        protein_g: { min: 7, max: 10 },
        carbs_g: { min: 11, max: 14 },
        fat_g: { min: 4, max: 9 },
      }]
    }
  },
  {
    id: 'quantity-3',
    description: '30g almonds',
    category: 'quantity',
    expected: {
      items: [{
        name: 'Almonds',
        quantity: 30,
        unit: 'g',
        calories: { min: 160, max: 200 },
        protein_g: { min: 5, max: 8 },
        carbs_g: { min: 4, max: 8 },
        fat_g: { min: 14, max: 18 },
      }]
    }
  },

  // === VAGUE ENTRIES ===
  {
    id: 'vague-1',
    description: 'A salad',
    category: 'vague',
    expected: {
      items: [{
        name: 'Salad',
        quantity: 1,
        unit: 'portion',
        calories: { min: 50, max: 200 },
        protein_g: { min: 2, max: 8 },
        carbs_g: { min: 5, max: 20 },
        fat_g: { min: 2, max: 15 },
      }]
    }
  },
  {
    id: 'vague-2',
    description: 'Some pasta',
    category: 'vague',
    expected: {
      items: [{
        name: 'Pasta',
        quantity: 1,
        unit: 'portion',
        calories: { min: 200, max: 450 },
        protein_g: { min: 7, max: 15 },
        carbs_g: { min: 40, max: 80 },
        fat_g: { min: 2, max: 15 },
      }]
    }
  },
  {
    id: 'vague-3',
    description: 'Un snack',
    category: 'vague',
    expected: {
      items: [{
        name: 'Snack',
        quantity: 1,
        unit: 'portion',
        calories: { min: 100, max: 300 },
        protein_g: { min: 1, max: 8 },
        carbs_g: { min: 10, max: 40 },
        fat_g: { min: 3, max: 18 },
      }]
    }
  },

  // === ALCOHOL ENTRIES ===
  {
    id: 'alcohol-1',
    description: '1 light beer',
    category: 'alcohol',
    expected: {
      items: [{
        name: 'Light beer',
        quantity: 1,
        unit: 'portion',
        calories: { min: 8, max: 20 },
        protein_g: { min: 0, max: 1 },
        carbs_g: { min: 2, max: 5 },
        fat_g: { min: 0, max: 0 },
        alcohol_g: 10,
      }]
    }
  },
  {
    id: 'alcohol-2',
    description: 'Glass of red wine',
    category: 'alcohol',
    expected: {
      items: [{
        name: 'Red wine',
        quantity: 1,
        unit: 'portion',
        calories: { min: 5, max: 20 },
        protein_g: { min: 0, max: 1 },
        carbs_g: { min: 1, max: 5 },
        fat_g: { min: 0, max: 0 },
        alcohol_g: 14,
      }]
    }
  },
  {
    id: 'alcohol-3',
    description: 'Una cerveza',
    category: 'alcohol',
    expected: {
      items: [{
        name: 'Cerveza',
        quantity: 1,
        unit: 'portion',
        calories: { min: 10, max: 30 },
        protein_g: { min: 0, max: 2 },
        carbs_g: { min: 3, max: 10 },
        fat_g: { min: 0, max: 0 },
        alcohol_g: 12,
      }]
    }
  },
]

export function getTestCasesByCategory(category: string): TestCase[] {
  return testCases.filter(tc => tc.category === category)
}

export function getTestCaseById(id: string): TestCase | undefined {
  return testCases.find(tc => tc.id === id)
}
