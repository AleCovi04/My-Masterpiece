import { useState } from 'react'
import { groupName } from '../../components/body'
import type { MuscleId, SetRange, Settings } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { rangeFor } from '../../lib/muscleVolume'

interface Props {
  settings: Settings
  /** Muscolo scelto sulla mappa: se c'è, si può dargli una fascia sua. */
  muscle: MuscleId | null
  onChange: (settings: Settings) => void
}

interface Draft {
  min: string
  max: string
}

const toDraft = (r: SetRange): Draft => ({
  min: String(r.min),
  max: String(r.max),
})

/** Da testo a fascia; `null` se non valida (numeri ≥ 0, minimo ≤ massimo). */
function parse(d: Draft): SetRange | null {
  const min = Number(d.min.replace(',', '.'))
  const max = Number(d.max.replace(',', '.'))
  if (d.min.trim() === '' || d.max.trim() === '') return null
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  return min >= 0 && min <= max ? { min, max } : null
}

/** Fascia di volume settimanale: globale e, per il muscolo scelto, personalizzata. */
export default function RangeEditor({ settings, muscle, onChange }: Props) {
  const { t, lang } = useI18n()
  const a = t.analysis
  const [open, setOpen] = useState(false)
  const own = muscle ? settings.muscleVolume.muscles[muscle] : undefined
  const [global, setGlobal] = useState<Draft>(() =>
    toDraft(settings.muscleVolume.default),
  )
  const [custom, setCustom] = useState<boolean>(!!own)
  const [mine, setMine] = useState<Draft>(() =>
    toDraft(
      muscle ? rangeFor(settings, muscle) : settings.muscleVolume.default,
    ),
  )
  const [shownFor, setShownFor] = useState<MuscleId | null>(muscle)
  const [error, setError] = useState(false)

  // cambiato muscolo sulla mappa: i campi ripartono dalla sua fascia
  if (shownFor !== muscle) {
    setShownFor(muscle)
    setCustom(!!own)
    setMine(
      toDraft(
        muscle ? rangeFor(settings, muscle) : settings.muscleVolume.default,
      ),
    )
    setError(false)
  }

  const cur = settings.muscleVolume.default
  const fmt = (n: number) => n.toLocaleString(lang)

  const save = () => {
    const g = parse(global)
    const m = muscle && custom ? parse(mine) : null
    if (!g || (muscle && custom && !m)) {
      setError(true)
      return
    }
    const muscles = { ...settings.muscleVolume.muscles }
    if (muscle) {
      if (m) muscles[muscle] = m
      else delete muscles[muscle]
    }
    onChange({ ...settings, muscleVolume: { default: g, muscles } })
    setError(false)
    setOpen(false)
  }

  if (!open) {
    return (
      <div className="ana-range-bar">
        <span>
          {a.rangeAll}:{' '}
          {a.range
            .replace('{min}', fmt(cur.min))
            .replace('{max}', fmt(cur.max))}
        </span>
        <button
          type="button"
          className="pl-btn pl-small"
          onClick={() => {
            setGlobal(toDraft(cur))
            setOpen(true)
          }}
        >
          {a.rangeEdit}
        </button>
      </div>
    )
  }

  const fields = (d: Draft, set: (d: Draft) => void, disabled = false) => (
    <div className="ana-range-fields">
      <label className="pl-fld">
        <span>{a.rangeMin}</span>
        <input
          className="pl-inp"
          inputMode="decimal"
          value={d.min}
          disabled={disabled}
          onChange={(e) => set({ ...d, min: e.target.value })}
        />
      </label>
      <label className="pl-fld">
        <span>{a.rangeMax}</span>
        <input
          className="pl-inp"
          inputMode="decimal"
          value={d.max}
          disabled={disabled}
          onChange={(e) => set({ ...d, max: e.target.value })}
        />
      </label>
    </div>
  )

  return (
    <div className="ana-range">
      <h4>{a.rangeAll}</h4>
      {fields(global, setGlobal)}
      {muscle && (
        <>
          <h4>{a.rangeOne.replace('{m}', groupName(muscle, lang))}</h4>
          <label className="pl-check">
            <input
              type="checkbox"
              checked={custom}
              onChange={(e) => setCustom(e.target.checked)}
            />
            {a.rangeCustom}
          </label>
          {custom ? (
            fields(mine, setMine)
          ) : (
            <p className="note">{a.rangeReset}</p>
          )}
        </>
      )}
      {error && <p className="ana-range-err">{a.rangeInvalid}</p>}
      <div className="ana-range-actions">
        <button
          type="button"
          className="pl-btn pl-small"
          onClick={() => setOpen(false)}
        >
          {t.calendar.cancel}
        </button>
        <button type="button" className="pl-btn acc pl-small" onClick={save}>
          {a.rangeSave}
        </button>
      </div>
    </div>
  )
}
