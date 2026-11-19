import { createContext, useContext } from 'react'
import type { Dictionary } from './it'

export type Lang = 'it' | 'en'

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Dictionary
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n va usato dentro I18nProvider')
  return ctx
}
