import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { useI18n } from '../../i18n/context'
import {
  HOLD_MOVE_PX,
  HOLD_MS,
  isolateChip,
  toggleChip,
} from '../../lib/filterChips'
import './filterChips.css'

interface ChipItem<K extends string> {
  key: K
  label: string
  /** Colore del chip, da una variabile del tema (es. `var(--swim)`). */
  color: string
}

interface Props<K extends string> {
  items: ChipItem<K>[]
  active: K[]
  onChange: (next: K[]) => void
  /** Nome del gruppo per i lettori di schermo. */
  label: string
  size?: 'sm' | 'md'
}

/**
 * Filtro a chip, uguale in tutta l'app: un clic accende o spegne il chip,
 * tenendo premuto `HOLD_MS` lo si isola (di nuovo sul chip isolato: tutti
 * accesi). Durante la pressione il chip si riempie. Da tastiera: Invio o
 * Spazio = clic, Maiusc + Invio = isola.
 */
export default function FilterChips<K extends string>({
  items,
  active,
  onChange,
  label,
  size = 'md',
}: Props<K>) {
  const { t } = useI18n()
  const all = items.map((i) => i.key)
  const [holding, setHolding] = useState<K | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const start = useRef<{ x: number; y: number } | null>(null)
  // dopo una pressione lunga il clic che segue non deve spegnere il chip
  const skipClick = useRef(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const cancel = () => {
    window.clearTimeout(timer.current)
    start.current = null
    setHolding(null)
  }

  const isolate = (key: K) => onChange(isolateChip(all, active, key))

  const down = (key: K) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    skipClick.current = false
    start.current = { x: e.clientX, y: e.clientY }
    setHolding(key)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      skipClick.current = true
      start.current = null
      setHolding(null)
      isolate(key)
    }, HOLD_MS)
  }

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current
    if (!s) return
    if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > HOLD_MOVE_PX) cancel()
  }

  const click = (key: K) => () => {
    if (skipClick.current) {
      skipClick.current = false
      return
    }
    onChange(toggleChip(all, active, key))
  }

  const key = (k: K) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      isolate(k)
    }
  }

  return (
    <div
      className={`fc${size === 'sm' ? ' sm' : ''}`}
      role="group"
      aria-label={label}
      title={t.filters.holdHint}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`fc-chip${holding === item.key ? ' holding' : ''}`}
          style={
            {
              '--c': item.color,
              '--hold': `${HOLD_MS}ms`,
            } as CSSProperties
          }
          aria-pressed={active.includes(item.key)}
          onPointerDown={down(item.key)}
          onPointerMove={move}
          onPointerUp={cancel}
          onPointerCancel={cancel}
          onPointerLeave={cancel}
          onContextMenu={(e) => e.preventDefault()}
          onClick={click(item.key)}
          onKeyDown={key(item.key)}
        >
          <span className="fc-fill" aria-hidden="true" />
          <i />
          <span className="fc-label">{item.label}</span>
        </button>
      ))}
    </div>
  )
}

/** Messaggio quando nessun chip è acceso. */
export function NoSeries() {
  const { t } = useI18n()
  return <p className="note fc-empty">{t.filters.noSeries}</p>
}
