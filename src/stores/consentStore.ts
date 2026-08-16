'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ConsentChoice = 'unset' | 'granted' | 'denied'

interface ConsentState {
  status: ConsentChoice
  setStatus: (status: ConsentChoice) => void
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      status: 'unset',
      setStatus: (status) => set({ status }),
    }),
    { name: 'luma-consent' }
  )
)
