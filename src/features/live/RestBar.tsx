import { useState } from 'react'
import type { LiveRest } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatMmSs, parseMmSs } from '../../lib/exercises'
import { restRemainingS } from '../../lib/liveWorkout'

interface Props {
  rest: LiveRest
  now: number
  onAdjust: (deltaS: number) => void
  onSet: (seconds: number) => void
  onSkip: () => void
}

/** "1:30" o "90" → 90 secondi. */
function parseRestInput(text: string): number | null {
  const t = text.trim()
  if (/^\d{1,4}$/.test(t)) return Number(t)
  return parseMmSs(t)
}

/** Barra fissa in basso: conto alla rovescia del recupero (calcolato dai timestamp). */
export default function RestBar({ rest, now, onAdjust, onSet, onSkip }: Props) {
  const { t } = useI18n()
  const l = t.live
  const [editing, setEditing] = useState<string | null>(null)
  const left = restRemainingS(rest, now)
  const over = left === 0
  const pct = Math.min(100, Math.max(0, (left / rest.totalS) * 100))
  const parsed = editing === null ? null : parseRestInput(editing)

  return (
    <div
      className={`lv-rest${over ? ' over' : ''}`}
      role="region"
      aria-label={l.restTitle}
    >
      <i className="lv-rest-fill" style={{ width: `${pct}%` }} />
      {editing !== null ? (
        <form
          className="lv-rest-edit"
          onSubmit={(e) => {
            e.preventDefault()
            if (parsed === null) return
            onSet(parsed)
            setEditing(null)
          }}
        >
          <input
            className="lv-inp"
            inputMode="numeric"
            autoFocus
            aria-label={l.restInput}
            placeholder="m:ss"
            value={editing}
            aria-invalid={editing.trim() !== '' && parsed === null}
            onChange={(e) => setEditing(e.target.value)}
          />
          <button
            type="submit"
            className="lv-rest-btn acc"
            disabled={parsed === null}
          >
            {l.ok}
          </button>
          <button
            type="button"
            className="lv-rest-btn"
            onClick={() => setEditing(null)}
          >
            ✕
          </button>
        </form>
      ) : (
        <>
          <button
            type="button"
            className="lv-rest-btn"
            onClick={() => onAdjust(-15)}
          >
            {l.restMinus}
          </button>
          <button
            type="button"
            className="lv-rest-time"
            aria-label={`${l.restTitle} ${formatMmSs(left)}. ${l.restSet}`}
            onClick={() => setEditing(formatMmSs(left))}
          >
            <small>{over ? l.restOver : l.restTitle}</small>
            <b>{formatMmSs(left)}</b>
          </button>
          <button
            type="button"
            className="lv-rest-btn"
            onClick={() => onAdjust(15)}
          >
            {l.restPlus}
          </button>
          <button type="button" className="lv-rest-btn acc" onClick={onSkip}>
            {over ? l.restClose : l.restSkip}
          </button>
        </>
      )}
    </div>
  )
}
