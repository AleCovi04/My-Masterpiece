import { MenuIcon, MoonIcon, SunIcon } from '../components/ui/Icons'
import { useI18n, type Lang } from '../i18n/context'
import { useTheme } from './theme'

const LANGS: Lang[] = ['it', 'en']

export default function Header({ onMenu }: { onMenu: () => void }) {
  const { t, lang, setLang } = useI18n()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="top">
      <div className="lead">
        <button
          className="burger"
          type="button"
          onClick={onMenu}
          aria-label={t.menu}
        >
          <MenuIcon />
        </button>
        <div className="brand">
          <b>{t.appName}</b>
          <span>{t.appSub}</span>
        </div>
      </div>
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
    </header>
  )
}
