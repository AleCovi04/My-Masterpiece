import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Id } from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  addExercises,
  addSet,
  adjustRest,
  completeSet,
  editSetText,
  hasDoneSets,
  liveGroups,
  moveExercise,
  removeSet,
  resolveSet,
  setHint,
  setRest,
  skipRest,
  supersetLabels,
  toggleSkip,
  uncompleteSet,
} from '../../lib/liveWorkout'
import ExercisePicker from '../forger/ExercisePicker'
import Modal from '../../components/ui/Modal'
import { useSortable } from '../../hooks/useSortable'
import FinishDialog from './FinishDialog'
import LiveExerciseCard, { type SetErrors } from './LiveExerciseCard'
import RestBar from './RestBar'
import { useLiveWorkout, useNow, useRestAlert, useWakeLock } from './hooks'
import './live.css'

const pad = (n: number) => String(n).padStart(2, '0')
/** 3725 → "1:02:05", 125 → "2:05". */
function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

/** Registrazione dal vivo della forza: schermo intero su telefono. */
export default function LivePage() {
  const { t } = useI18n()
  const l = t.live
  const navigate = useNavigate()
  const live = useLiveWorkout()
  const { workout: w, sessions, exercises, change } = live
  const now = useNow(1000)
  const [errors, setErrors] = useState<Record<string, SetErrors>>({})
  const [picking, setPicking] = useState(false)
  const [confirming, setConfirming] = useState<
    null | 'finish' | 'empty' | 'cancel'
  >(null)
  const [cancelling, setCancelling] = useState(false)
  const [endedAt, setEndedAt] = useState<number | null>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const scrollTo = useRef<string | null>(null)

  useWakeLock(!!w)
  useRestAlert(live.loading ? null : (w?.rest?.endsAt ?? null), {
    title: l.restOver,
    body: l.restAlertBody,
    channel: l.restChannel,
  })

  const { drag, handleProps } = useSortable({
    listRef,
    onMove: (from, to) => change((cur) => moveExercise(cur, from, to)),
  })

  // scorrimento automatico all'esercizio successivo quando finisci le sue serie
  const focusEx = w?.focus?.exercise ?? null
  useEffect(() => {
    const id = scrollTo.current
    if (!id || id !== focusEx) return
    scrollTo.current = null
    listRef.current
      ?.querySelector<HTMLElement>(`[data-ex="${id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusEx])

  const session = w ? sessions.find((s) => s.id === w.sessionId) : undefined
  const labels = useMemo(() => (w ? supersetLabels(w.exercises) : []), [w])
  const groupEnds = useMemo(
    () => new Set(w ? liveGroups(w.exercises).map(([, b]) => b - 1) : []),
    [w],
  )
  const nameOf = (id: Id) =>
    exercises.find((e) => e.id === id)?.name ?? t.calendar.unknownExercise

  if (live.loading) return <div className="ph">{l.loading}</div>
  if (!w) {
    return (
      <div className="ph lv-none">
        <p>{l.none}</p>
        <Link className="pl-btn acc" to="/calendario">
          {l.toCalendar}
        </Link>
      </div>
    )
  }

  const title = session?.name ?? t.discipline.strength
  const elapsed = (now - Date.parse(w.startedAt)) / 1000

  const clearError = (setId: string) =>
    setErrors((e) => {
      if (!e[setId]) return e
      const { [setId]: _gone, ...rest } = e
      void _gone
      return rest
    })

  const check = (exId: string, k: number) => {
    const ex = w.exercises.find((e) => e.id === exId)
    const set = ex?.sets[k]
    if (!ex || !set) return
    if (set.done) {
      change((cur) => uncompleteSet(cur, exId, k))
      return
    }
    const r = resolveSet(set, setHint(ex, k, sessions))
    if (!r.ok) {
      setErrors((e) => ({ ...e, [set.id]: { kg: r.kg, reps: r.reps } }))
      return
    }
    clearError(set.id)
    const at = Date.now()
    change((cur) => {
      const next = completeSet(cur, exId, k, r, at)
      if (next.focus && next.focus.exercise !== exId) {
        scrollTo.current = next.focus.exercise
      }
      return next
    })
  }

  return (
    <div className="lv" data-scroller data-discipline="strength">
      <header className="lv-top">
        <div className="lv-title">
          <small>{t.discipline.strength}</small>
          <h1>{title}</h1>
        </div>
        <span className="lv-clock" role="timer" aria-label={l.elapsed}>
          {clock(elapsed)}
        </span>
        <button
          type="button"
          className="pl-btn acc lv-end"
          onClick={() => setConfirming(hasDoneSets(w) ? 'finish' : 'empty')}
        >
          {l.finish}
        </button>
      </header>

      {w.exercises.length === 0 ? (
        <div className="ph">{l.noExercises}</div>
      ) : (
        <ol className="lv-list" ref={listRef}>
          {drag && <div className="pl-dropline" style={{ top: drag.line }} />}
          {w.exercises.map((ex, i) => (
            <LiveExerciseCard
              key={ex.id}
              ex={ex}
              index={i}
              name={nameOf(ex.exerciseId)}
              supersetLabel={labels[i]}
              restAfterRound={groupEnds.has(i)}
              current={w.focus?.exercise === ex.id}
              focusSet={w.focus?.exercise === ex.id ? w.focus.set : null}
              sessions={sessions}
              errors={errors}
              handle={handleProps(i)}
              dragging={drag?.from === i}
              onText={(k, field, text) => {
                clearError(ex.sets[k].id)
                change((cur) => editSetText(cur, ex.id, k, field, text))
              }}
              onFocusSet={(k) =>
                change((cur) =>
                  cur.focus?.exercise === ex.id && cur.focus.set === k
                    ? cur
                    : { ...cur, focus: { exercise: ex.id, set: k } },
                )
              }
              onCheck={(k) => check(ex.id, k)}
              onAddSet={() => change((cur) => addSet(cur, ex.id))}
              onRemoveSet={() => change((cur) => removeSet(cur, ex.id))}
              onToggleSkip={() => change((cur) => toggleSkip(cur, ex.id))}
            />
          ))}
        </ol>
      )}

      <button
        type="button"
        className="pl-btn lv-add"
        onClick={() => setPicking(true)}
      >
        {l.addExercise}
      </button>

      <button
        type="button"
        className="pl-btn warn lv-cancel"
        onClick={() => setConfirming('cancel')}
      >
        {l.cancelWorkout}
      </button>

      {w.rest && (
        <RestBar
          rest={w.rest}
          now={now}
          onAdjust={(d) => change((cur) => adjustRest(cur, d, Date.now()))}
          onSet={(s) => change((cur) => setRest(cur, s, Date.now()))}
          onSkip={() => change(skipRest)}
        />
      )}

      {picking && (
        <ExercisePicker
          exercises={exercises}
          onAdd={(picked) => {
            const chosen = picked.flatMap((id) => {
              const e = exercises.find((x) => x.id === id)
              return e ? [e] : []
            })
            change((cur) => addExercises(cur, chosen, sessions))
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {confirming === 'finish' && (
        <Modal
          title={l.confirmTitle}
          closeLabel={l.back}
          onClose={() => setConfirming(null)}
        >
          <p className="lv-muted">{l.confirmText}</p>
          <div className="pl-actions">
            <button
              type="button"
              className="pl-btn acc"
              onClick={() => {
                setConfirming(null)
                setEndedAt(Date.now())
              }}
            >
              {l.confirmYes}
            </button>
            <button
              type="button"
              className="pl-btn"
              onClick={() => setConfirming(null)}
            >
              {l.back}
            </button>
          </div>
        </Modal>
      )}

      {(confirming === 'cancel' || confirming === 'empty') && (
        <Modal
          title={confirming === 'empty' ? l.emptyTitle : l.cancelTitle}
          closeLabel={l.back}
          onClose={() => setConfirming(null)}
        >
          <p className="lv-muted">
            {confirming === 'empty' ? l.emptyText : l.cancelText}
          </p>
          <div className="pl-actions">
            <button
              type="button"
              className="pl-btn warn"
              disabled={cancelling}
              onClick={async () => {
                setCancelling(true)
                try {
                  await live.cancel()
                  navigate('/calendario')
                } finally {
                  setCancelling(false)
                }
              }}
            >
              {l.cancelYes}
            </button>
            <button
              type="button"
              className="pl-btn"
              onClick={() => setConfirming(null)}
            >
              {l.back}
            </button>
          </div>
        </Modal>
      )}

      {endedAt !== null && (
        <FinishDialog
          workout={w}
          sessions={sessions}
          exercises={exercises}
          endedAtMs={endedAt}
          onSave={async (notes, rpe) => {
            await live.finish(endedAt, notes, rpe)
            navigate('/calendario')
          }}
          onBack={() => setEndedAt(null)}
        />
      )}
    </div>
  )
}
