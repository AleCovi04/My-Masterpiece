import { NavLink } from 'react-router-dom'
import { ChevronIcon } from '../components/ui/Icons'
import { useGoal } from '../hooks/useGoal'
import { useI18n } from '../i18n/context'
import { NAV_ITEMS } from './navItems'
import Tools from './Tools'

interface Props {
  collapsed: boolean
  onToggle: () => void
}

/** Sidebar fissa, solo da 1024 px (sotto è nascosta via CSS). */
export default function Sidebar({ collapsed, onToggle }: Props) {
  const { t } = useI18n()
  const goal = useGoal()
  return (
    <aside className="side">
      <div className="brand side-brand">
        <b className="brand-full">{t.appName}</b>
        <b className="brand-mini" aria-hidden="true">
          MM
        </b>
        {goal && (
          <span className="brand-sub">
            {t.roadTo} {goal}
          </span>
        )}
      </div>
      <nav className="side-nav" aria-label={t.menu}>
        {NAV_ITEMS.map((item) => {
          const label = item.label(t)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="nav-item"
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
            >
              {item.icon}
              <span>{label}</span>
            </NavLink>
          )
        })}
      </nav>
      <div className="side-foot">
        <Tools />
        <button
          type="button"
          className="side-toggle"
          aria-expanded={!collapsed}
          aria-label={collapsed ? t.expandSidebar : t.collapseSidebar}
          title={collapsed ? t.expandSidebar : t.collapseSidebar}
          onClick={onToggle}
        >
          <ChevronIcon />
        </button>
      </div>
    </aside>
  )
}
