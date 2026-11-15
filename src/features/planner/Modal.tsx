import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  title: string
  closeLabel: string
  onClose: () => void
  children: ReactNode
  /** Finestra larga (es. mappa muscolare). */
  wide?: boolean
}

/** Finestra modale: Esc e clic fuori chiudono, il focus torna dove era. */
export default function Modal({
  title,
  closeLabel,
  onClose,
  children,
  wide,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    boxRef.current
      ?.querySelector<HTMLElement>('input, select, textarea, button')
      ?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [])

  return (
    <div
      className="pl-mod"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`pl-box${wide ? ' wide' : ''}`}
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="pl-box-h">
          <h3>{title}</h3>
          <button
            type="button"
            className="pl-x"
            aria-label={closeLabel}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
