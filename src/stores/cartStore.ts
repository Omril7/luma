'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string // unique line-item id
  productId: string
  productSlug: string
  name_he: string
  name_en: string
  imageUrl?: string
  variantId?: string
  variantName?: string
  isCustom: boolean
  customWidth?: number
  customHeight?: number
  customDepth?: number
  customDiameter?: number
  selectedColorId?: string
  quantity: number
  unitPrice: number // agorot
  totalPrice: number // agorot
}

interface CartState {
  items: CartItem[]
  couponCode: string | null
  discount: number // agorot
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  setCoupon: (code: string | null, discount: number) => void
  clear: () => void
  subtotal: () => number
  total: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      discount: 0,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) =>
              i.productId === item.productId &&
              i.variantId === item.variantId &&
              i.isCustom === item.isCustom &&
              i.customWidth === item.customWidth &&
              i.customHeight === item.customHeight &&
              i.customDepth === item.customDepth &&
              i.selectedColorId === item.selectedColorId
          )
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === existing.id
                  ? {
                      ...i,
                      quantity: i.quantity + item.quantity,
                      totalPrice: i.unitPrice * (i.quantity + item.quantity),
                    }
                  : i
              ),
            }
          }
          return { items: [...state.items, item] }
        }),

      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity, totalPrice: i.unitPrice * quantity } : i
          ),
        })),

      setCoupon: (code, discount) => set({ couponCode: code, discount }),

      clear: () => set({ items: [], couponCode: null, discount: 0 }),

      subtotal: () => get().items.reduce((sum, i) => sum + i.totalPrice, 0),

      total: () => {
        const subtotal = get().subtotal()
        return Math.max(0, subtotal - get().discount)
      },
    }),
    { name: 'luma-cart' }
  )
)
