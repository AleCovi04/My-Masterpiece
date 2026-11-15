import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import {
  CalendarIcon,
  MenuIcon,
  OverviewIcon,
  PlannerIcon,
} from '../components/ui/Icons'
import { useI18n } from '../i18n/context'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SideMenu({ open, onClose }: Props) {
  const { t } = useI18n()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        className={`scrim${open ? ' on' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <nav
        className={`drawer${open ? ' on' : ''}`}
        aria-label={t.menu}
        inert={!open}
      >
        <div className="lead">
          <button
            ref={closeRef}
            className="burger"
            type="button"
            onClick={onClose}
            aria-label={t.closeMenu}
          >
            <MenuIcon />
          </button>
          <div className="brand">
            <b>{t.appName}</b>
            <span>{t.appSub}</span>
          </div>
        </div>
        <NavLink to="/" end className="nav-item" onClick={onClose}>
          <OverviewIcon />
          <span>{t.nav.overview}</span>
        </NavLink>
        <NavLink to="/calendario" className="nav-item" onClick={onClose}>
          <CalendarIcon />
          <span>{t.nav.calendar}</span>
        </NavLink>
        <NavLink to="/planner" className="nav-item" onClick={onClose}>
          <PlannerIcon />
          <span>{t.nav.planner}</span>
        </NavLink>
      </nav>
    </>
  )
}
