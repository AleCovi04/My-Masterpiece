import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { MenuIcon } from '../components/ui/Icons'
import { useI18n } from '../i18n/context'
import { NAV_ITEMS } from './navItems'

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
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="nav-item"
            onClick={onClose}
          >
            {item.icon}
            <span>{item.label(t)}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
