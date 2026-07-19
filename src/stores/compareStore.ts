'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const MAX_COMPARE_ITEMS = 3

interface CompareState {
  ids: string[]
  /** Adds/removes a product; silently ignores adds beyond MAX_COMPARE_ITEMS. */
  toggle: (productId: string) => void
  has: (productId: string) => boolean
  remove: (productId: string) => void
  clear: () => void
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (productId) =>
        set((s) => {
          if (s.ids.includes(productId)) {
            return { ids: s.ids.filter((id) => id !== productId) }
          }
          if (s.ids.length >= MAX_COMPARE_ITEMS) return s
          return { ids: [...s.ids, productId] }
        }),
      has: (productId) => get().ids.includes(productId),
      remove: (productId) => set((s) => ({ ids: s.ids.filter((id) => id !== productId) })),
      clear: () => set({ ids: [] }),
    }),
    // Session-only by design: a comparison is a momentary task, not a saved list
    { name: 'luma-compare', storage: createJSONStorage(() => sessionStorage) }
  )
)
