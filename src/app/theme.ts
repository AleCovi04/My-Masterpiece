import { createContext, useContext } from 'react'
import { readPreference } from '../lib/preferences'

export type Theme = 'light' | 'dark'

export const THEME_KEY = 'mm.theme'

export function loadTheme(): Theme {
  return readPreference(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

export interface ThemeCtx {
  theme: Theme
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeCtx | null>(null)

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme va usato dentro ThemeProvider')
  return ctx
}
