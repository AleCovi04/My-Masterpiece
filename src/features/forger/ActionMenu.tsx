import { useEffect, useRef, useState } from 'react'

export interface MenuAction {
  label: string
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

/** Menu ⋯: si chiude con clic fuori ed Esc (senza chiudere la finestra sotto). */
export default function ActionMenu({
  label,
  actions,
}: {
  label: string
  actions: MenuAction[]
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation() // in cattura: la modale sotto non lo vede
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <span className="pl-menu" ref={rootRef}>
      <button
        type="button"
        className="pl-ico pl-ico-static"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
      </button>
      {open && (
        <div className="pl-menu-list" role="menu">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              className={a.danger ? 'warn' : undefined}
              disabled={a.disabled}
              onClick={() => {
                setOpen(false)
                a.onSelect()
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
