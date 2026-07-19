'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistState {
  ids: string[]
  toggle: (productId: string) => void
  has: (productId: string) => boolean
  merge: (productIds: string[]) => void
  remove: (productId: string) => void
  clear: () => void
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (productId) =>
        set((s) => ({
          ids: s.ids.includes(productId)
            ? s.ids.filter((id) => id !== productId)
            : [...s.ids, productId],
        })),
      has: (productId) => get().ids.includes(productId),
      merge: (productIds) =>
        set((s) => ({
          ids: [...s.ids, ...productIds.filter((id) => !s.ids.includes(id))],
        })),
      remove: (productId) => set((s) => ({ ids: s.ids.filter((id) => id !== productId) })),
      clear: () => set({ ids: [] }),
    }),
    { name: 'luma-wishlist' }
  )
)
