'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

interface A11yPrefs {
  fontScale: number
  highContrast: boolean
  reduceMotion: boolean
  underlineLinks: boolean
}

interface UiState {
  toasts: Toast[]
  a11y: A11yPrefs
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setA11y: (prefs: Partial<A11yPrefs>) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      toasts: [],
      a11y: {
        fontScale: 1,
        highContrast: false,
        reduceMotion: false,
        underlineLinks: false,
      },

      addToast: (toast) => {
        const id = crypto.randomUUID()
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
        setTimeout(
          () => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
          5000
        )
      },

      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      setA11y: (prefs) => set((state) => ({ a11y: { ...state.a11y, ...prefs } })),
    }),
    {
      name: 'luma-ui',
      partialize: (state) => ({ a11y: state.a11y }),
    }
  )
)
