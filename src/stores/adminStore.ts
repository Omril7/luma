'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AdminState {
  token: string | null
  email: string | null
  setAuth: (token: string, email: string) => void
  clearAuth: () => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      setAuth: (token, email) => set({ token, email }),
      clearAuth: () => set({ token: null, email: null }),
    }),
    { name: 'luma-admin' }
  )
)
