import type { HTMLAttributes } from 'react'
import type { LiveExercise, Session } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatMmSs } from '../../lib/exercises'
import { setHint } from '../../lib/liveWorkout'

export interface SetErrors {
  kg?: boolean
  reps?: boolean
}

interface Props {
  ex: LiveExercise
  index: number
  name: string
  supersetLabel?: string
  /** Ultimo esercizio del gruppo: il suo recupero vale per il giro. */
  restAfterRound: boolean
  current: boolean
  focusSet: number | null
  sessions: Session[]
  errors: Record<string, SetErrors>
  handle: HTMLAttributes<HTMLElement>
  dragging: boolean
  onText: (set: number, field: 'kg' | 'reps', text: string) => void
  onFocusSet: (set: number) => void
  onCheck: (set: number) => void
  onAddSet: () => void
  onRemoveSet: () => void
  onToggleSkip: () => void
}

/** Un esercizio della schermata live: una riga per serie (kg, reps, RIR obiettivo, ✓). */
export default function LiveExerciseCard({
  ex,
  index,
  name,
  supersetLabel,
  restAfterRound,
  current,
  focusSet,
  sessions,
  errors,
  handle,
  dragging,
  onText,
  onFocusSet,
  onCheck,
  onAddSet,
  onRemoveSet,
  onToggleSkip,
}: Props) {
  const { t, lang } = useI18n()
  const l = t.live
  const num = (n: number) =>
    n.toLocaleString(lang, { maximumFractionDigits: 2 })
  const last = ex.sets[ex.sets.length - 1]
  const inSuperset = !!supersetLabel

  return (
    <li
      className={`lv-ex${current ? ' cur' : ''}${ex.skipped ? ' skipped' : ''}${dragging ? ' dragging' : ''}`}
      data-block={index}
      data-ex={ex.id}
    >
      <div className="lv-ex-h">
        <button
          type="button"
          className="lv-handle"
          aria-label={l.dragHandle}
          title={l.dragHandle}
          {...handle}
        >
          ⋮⋮
        </button>
        <div className="lv-ex-name">
          <b>{name}</b>
          <small>
            {inSuperset && (
              <span className="lv-ss">
                {l.superset} {supersetLabel}
              </span>
            )}
            {(!inSuperset || restAfterRound) &&
              `${inSuperset ? l.restAfterRound : l.rest} ${formatMmSs(ex.restSeconds)}`}
          </small>
        </div>
        {current && !ex.skipped && <span className="lv-cur">{l.current}</span>}
        {ex.skipped && <span className="lv-cur off">{l.skipped}</span>}
      </div>

      {ex.notes && <p className="lv-note">{ex.notes}</p>}

      {!ex.skipped && ex.sets.length > 0 && (
        <div className="lv-sets">
          <div className="lv-set lv-set-h" aria-hidden="true">
            <span>#</span>
            <span>{l.kg}</span>
            <span>{l.reps}</span>
            <span>{l.rir}</span>
            <span />
          </div>
          {ex.sets.map((s, k) => {
            const hint = setHint(ex, k, sessions)
            const err = errors[s.id] ?? {}
            const repsHint = [
              hint.reps !== undefined ? String(hint.reps) : null,
              hint.targetReps !== undefined
                ? `${l.goalShort} ${hint.targetReps}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')
            const done = s.done
            const label = `${l.set} ${k + 1}`
            return (
              <div
                key={s.id}
                className={`lv-set${done ? ' done' : ''}${current && focusSet === k ? ' focus' : ''}`}
              >
                <span className="lv-n">{k + 1}</span>
                <input
                  className="lv-inp"
                  inputMode="decimal"
                  enterKeyHint="next"
                  autoComplete="off"
                  aria-label={`${label}, ${l.kg}`}
                  placeholder={hint.kg !== undefined ? num(hint.kg) : ''}
                  value={done ? num(done.kg) : s.kg}
                  readOnly={!!done}
                  aria-invalid={err.kg || undefined}
                  onFocus={() => !done && onFocusSet(k)}
                  onChange={(e) => onText(k, 'kg', e.target.value)}
                />
                <input
                  className="lv-inp"
                  inputMode="numeric"
                  enterKeyHint="done"
                  autoComplete="off"
                  aria-label={`${label}, ${l.reps}`}
                  placeholder={repsHint}
                  value={done ? String(done.reps) : s.reps}
                  readOnly={!!done}
                  aria-invalid={err.reps || undefined}
                  onFocus={() => !done && onFocusSet(k)}
                  onChange={(e) => onText(k, 'reps', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !done) onCheck(k)
                  }}
                />
                <span className="lv-rir">
                  {s.targetRir !== undefined ? s.targetRir : '—'}
                </span>
                <button
                  type="button"
                  className="lv-check"
                  aria-pressed={!!done}
                  aria-label={
                    done ? `${l.uncheck} ${k + 1}` : `${l.check} ${k + 1}`
                  }
                  onClick={() => onCheck(k)}
                >
                  ✓
                </button>
                {(err.kg || err.reps) && (
                  <em className="lv-err" role="alert">
                    {err.kg
                      ? s.kg.trim()
                        ? l.invalid
                        : l.kgMissing
                      : s.reps.trim()
                        ? l.invalid
                        : l.repsMissing}
                  </em>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="lv-ex-actions">
        {!ex.skipped && (
          <>
            <button
              type="button"
              className="pl-btn pl-small"
              onClick={onAddSet}
            >
              {l.addSet}
            </button>
            <button
              type="button"
              className="pl-btn pl-small"
              disabled={!last || !!last.done}
              onClick={onRemoveSet}
            >
              {l.removeSet}
            </button>
          </>
        )}
        <button
          type="button"
          className="pl-btn pl-small lv-skip"
          onClick={onToggleSkip}
        >
          {ex.skipped ? l.unskip : l.skip}
        </button>
      </div>
    </li>
  )
}
