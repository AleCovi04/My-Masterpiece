import { useEffect, useRef, type ReactNode } from 'react'
import { useBackClose } from '../../hooks/useBackClose'

interface Props {
  title: string
  closeLabel: string
  onClose: () => void
  children: ReactNode
  /** Finestra larga (es. mappa muscolare). */
  wide?: boolean
  /** Il clic fuori chiude (default sì); da disattivare nei moduli lunghi. */
  backdropClose?: boolean
}

// Pila delle finestre aperte: Esc chiude solo quella in cima.
const openStack: symbol[] = []

/** Finestra modale: Esc, clic fuori e Indietro di Android chiudono; il focus torna dove era. */
export default function Modal({
  title,
  closeLabel,
  onClose,
  children,
  wide,
  backdropClose = true,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  })
  // tasto Indietro di Android: come la ×, senza cambiare pagina
  useBackClose(true, onClose)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const me = Symbol('modal')
    openStack.push(me)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openStack[openStack.length - 1] === me) {
        closeRef.current()
      }
    }
    document.addEventListener('keydown', onKey)
    boxRef.current
      ?.querySelector<HTMLElement>('input, select, textarea, button')
      ?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      openStack.splice(openStack.indexOf(me), 1)
      previous?.focus?.()
    }
  }, [])

  return (
    <div
      className="pl-mod"
      onMouseDown={(e) => {
        if (backdropClose && e.target === e.currentTarget) onClose()
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
