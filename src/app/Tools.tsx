import { MoonIcon, SunIcon } from '../components/ui/Icons'
import { useI18n, type Lang } from '../i18n/context'
import { useTheme } from './theme'

const LANGS: Lang[] = ['it', 'en']

/** Selettore lingua IT/EN e tema: nell'header (telefono) e nella sidebar (PC). */
export default function Tools() {
  const { t, lang, setLang } = useI18n()
  const { theme, toggleTheme } = useTheme()
  return (
    <div className="tools">
      <div className="seg" role="group" aria-label={t.language}>
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={lang === l}
            onClick={() => setLang(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <button
        className="icon-btn"
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'light' ? t.switchToDark : t.switchToLight}
      >
        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
      </button>
    </div>
  )
}
