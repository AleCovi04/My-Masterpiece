import { useMemo, useState, type ReactNode } from 'react'
import { writePreference } from '../lib/preferences'
import {
  THEME_KEY,
  ThemeContext,
  applyTheme,
  loadTheme,
  type Theme,
} from './theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadTheme)

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => {
        const next: Theme = theme === 'light' ? 'dark' : 'light'
        applyTheme(next)
        writePreference(THEME_KEY, next)
        setTheme(next)
      },
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
