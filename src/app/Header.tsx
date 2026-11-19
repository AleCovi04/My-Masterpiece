import { MenuIcon } from '../components/ui/Icons'
import { useGoal } from '../hooks/useGoal'
import { useI18n } from '../i18n/context'
import Tools from './Tools'

export default function Header({ onMenu }: { onMenu: () => void }) {
  const { t } = useI18n()
  const goal = useGoal()

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
          {goal && (
            <span>
              {t.roadTo} {goal}
            </span>
          )}
        </div>
      </div>
      <Tools />
    </header>
  )
}
