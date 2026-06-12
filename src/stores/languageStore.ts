'use client'

import { create } from 'zustand'
import type { Locale } from '@/shared/constants'
import { LOCALE_DEFAULT } from '@/shared/constants'

interface LanguageState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLanguageStore = create<LanguageState>()((set) => ({
  locale: LOCALE_DEFAULT,
  setLocale: (locale) => set({ locale }),
}))
