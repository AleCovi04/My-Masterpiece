import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { useI18n } from '../../i18n/context'
import { BACK, FRONT, type Figure } from './figures'
import { BODY_GROUPS, groupName, type BodyGroup } from './groups'
import './body.css'

interface SelectProps {
  mode: 'select'
  selected: BodyGroup[]
  onChange: (next: BodyGroup[]) => void
  /** Selezione multipla; altrimenti un solo gruppo (un secondo tocco lo deseleziona). */
  multiple?: boolean
}

interface HeatProps {
  mode: 'heat'
  values: Partial<Record<BodyGroup, number>>
  /** Valore che corrisponde a `--heat-hi`; di default il massimo dei valori. */
  max?: number
  formatValue?: (value: number) => string
  /** Colore di ogni gruppo (variabili del tema): sostituisce la scala di `values`. */
  colors?: Partial<Record<BodyGroup, string>>
  /** Legenda al posto della scala 0 → massimo (`null` = nessuna). */
  legend?: ReactNode
  /** Gruppo scelto (facoltativo): con `onSelect` i gruppi diventano toccabili. */
  selected?: BodyGroup | null
  onSelect?: (id: BodyGroup | null) => void
}

type BodyMapProps = (SelectProps | HeatProps) & { className?: string }

type View = 'front' | 'back'

const LABELS = {
  it: {
    front: 'Fronte',
    back: 'Retro',
    legend: 'Legenda',
    map: 'Mappa muscolare',
  },
  en: { front: 'Front', back: 'Back', legend: 'Legend', map: 'Muscle map' },
} as const

const TOUCH_TIP_MS = 1600

interface Tip {
  text: string
  x: number
  y: number
}

export default function BodyMap(props: BodyMapProps) {
  const { lang } = useI18n()
  const L = LABELS[lang]
  const [view, setView] = useState<View>('front')
  const [tip, setTip] = useState<Tip | null>(null)
  const [pressed, setPressed] = useState<BodyGroup | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const heatValues = props.mode === 'heat' ? props.values : null
  const heatMax =
    props.mode === 'heat'
      ? (props.max ?? Math.max(0, ...Object.values(props.values)))
      : 0
  const fmt = (v: number) =>
    props.mode === 'heat' && props.formatValue
      ? props.formatValue(v)
      : String(Math.round(v * 100) / 100)

  const toggle = (id: BodyGroup) => {
    if (props.mode === 'heat') {
      props.onSelect?.(props.selected === id ? null : id)
      return
    }
    const has = props.selected.includes(id)
    props.onChange(
      props.multiple
        ? has
          ? props.selected.filter((g) => g !== id)
          : [...props.selected, id]
        : has
          ? []
          : [id],
    )
  }

  const tipText = (id: BodyGroup) =>
    heatValues
      ? `${groupName(id, lang)} · ${fmt(heatValues[id] ?? 0)}`
      : groupName(id, lang)

  const placeTip = (id: BodyGroup, clientX: number, clientY: number) => {
    const r = wrapRef.current?.getBoundingClientRect()
    if (!r) return
    setTip({ text: tipText(id), x: clientX - r.left, y: clientY - r.top })
  }

  const groupHandlers = (id: BodyGroup) => ({
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') placeTip(id, e.clientX, e.clientY)
    },
    onPointerMove: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') placeTip(id, e.clientX, e.clientY)
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setTip(null)
    },
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      // al tocco: evidenzia e mostra il nome per un momento
      setPressed(id)
      placeTip(id, e.clientX, e.clientY - 44)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        setPressed(null)
        setTip(null)
      }, TOUCH_TIP_MS)
    },
    onFocus: (e: React.FocusEvent<SVGGElement>) => {
      const b = e.currentTarget.getBoundingClientRect()
      placeTip(id, b.left + b.width / 2, b.top)
    },
    onBlur: () => setTip(null),
  })

  const renderGroup = (fig: Figure, view: View, id: BodyGroup) => {
    const name = groupName(id, lang)
    const selected =
      props.mode === 'select'
        ? props.selected.includes(id)
        : props.selected === id
    const interactive = props.mode === 'select' || !!props.onSelect
    const value = heatValues?.[id] ?? 0
    const style: CSSProperties & Record<string, string> = {}
    const custom = props.mode === 'heat' ? props.colors?.[id] : undefined
    if (custom) {
      style['--bm-fill'] = custom
    } else if (heatValues && value > 0 && heatMax > 0) {
      const pct = 15 + 85 * Math.min(1, value / heatMax)
      style['--bm-fill'] =
        `color-mix(in srgb, var(--heat-hi) ${pct.toFixed(1)}%, var(--heat-lo))`
    }
    const common = {
      className: `bm-g${selected ? ' sel' : ''}${pressed === id ? ' hot' : ''}`,
      style,
      tabIndex: 0,
      ...groupHandlers(id),
    }
    const shapes = fig.parts.map((p, i) =>
      p.group === id ? (
        <path
          key={i}
          d={p.d}
          clipPath={p.clip ? `url(#${uid}${view}p${i})` : undefined}
        />
      ) : null,
    )
    return interactive ? (
      <g
        key={id}
        {...common}
        role="button"
        aria-pressed={selected}
        aria-label={heatValues ? tipText(id) : name}
        onClick={() => toggle(id)}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle(id)
          }
        }}
      >
        {shapes}
      </g>
    ) : (
      <g key={id} {...common} role="img" aria-label={tipText(id)}>
        {shapes}
      </g>
    )
  }

  const renderFigure = (v: View, fig: Figure) => {
    const groups = BODY_GROUPS.filter((g) =>
      fig.parts.some((p) => p.group === g.id),
    )
    return (
      <figure className={`bm-fig bm-fig-${v}`} key={v}>
        <svg
          viewBox={fig.viewBox}
          className="bm-svg"
          role="group"
          aria-label={L[v]}
        >
          <defs>
            {fig.parts.map((p, i) =>
              p.clip ? (
                <clipPath key={i} id={`${uid}${v}p${i}`}>
                  <path d={p.clip} />
                </clipPath>
              ) : null,
            )}
            {fig.seams.map((sm, i) => (
              <clipPath key={i} id={`${uid}${v}s${i}`}>
                <path d={sm.shape} />
              </clipPath>
            ))}
          </defs>
          {fig.parts.map((p, i) =>
            p.group === null ? (
              <path
                key={i}
                className={p.tone === 'joint' ? 'bm-joint' : 'bm-neutral'}
                d={p.d}
              />
            ) : null,
          )}
          {groups.map((g) => renderGroup(fig, v, g.id))}
          {fig.seams.map((sm, i) => (
            <path
              key={i}
              className="bm-seam"
              d={sm.d}
              clipPath={`url(#${uid}${v}s${i})`}
            />
          ))}
        </svg>
        <figcaption>{L[v]}</figcaption>
      </figure>
    )
  }

  return (
    <div
      className={`bm ${props.mode}${props.className ? ` ${props.className}` : ''}`}
      data-view={view}
      ref={wrapRef}
    >
      <div className="bm-switch" role="group" aria-label={L.map}>
        {(['front', 'back'] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
          >
            {L[v]}
          </button>
        ))}
      </div>
      <div className="bm-figs">
        {renderFigure('front', FRONT)}
        {renderFigure('back', BACK)}
      </div>
      {props.mode === 'heat' && props.legend !== undefined && props.legend}
      {props.mode === 'heat' && props.legend === undefined && (
        <div className="bm-legend" aria-label={L.legend}>
          <span>{fmt(0)}</span>
          <i />
          <span>{fmt(heatMax)}</span>
        </div>
      )}
      {tip && (
        <div
          className="bm-tip"
          role="tooltip"
          style={{ left: tip.x + 12, top: tip.y + 12 }}
        >
          {tip.text}
        </div>
      )}
    </div>
  )
}
