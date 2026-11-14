import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { readPreference, writePreference } from '../lib/preferences'
import { I18nContext, type Lang } from './context'
import { en } from './en'
import { it } from './it'

const LANG_KEY = 'mm.lang'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() =>
    readPreference(LANG_KEY) === 'en' ? 'en' : 'it',
  )

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      t: lang === 'en' ? en : it,
      setLang: (l: Lang) => {
        setLangState(l)
        writePreference(LANG_KEY, l)
      },
    }),
    [lang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
