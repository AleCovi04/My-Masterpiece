import { MenuIcon } from '../components/ui/Icons'
import { useI18n } from '../i18n/context'
import Tools from './Tools'

export default function Header({ onMenu }: { onMenu: () => void }) {
  const { t } = useI18n()

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
      <Tools />
    </header>
  )
}
