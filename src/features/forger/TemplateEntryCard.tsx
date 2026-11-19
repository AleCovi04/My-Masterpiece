import { useState, type ComponentProps } from 'react'
import { DEFAULT_REST_SECONDS } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatMmSs, parseMmSs } from '../../lib/exercises'
import { newId } from '../../lib/ids'
import { expandSets } from '../../lib/templates'
import ActionMenu, { type MenuAction } from './ActionMenu'
import {
  type DEntry,
  blankSet,
  parseIntIn,
  repsBad,
  rirBad,
} from './templateDraft'

interface EntryCardProps {
  entry: DEntry
  name: string
  /** Solo l'ultimo esercizio del giro ha il recupero. */
  showRest: boolean
  inSuperset: boolean
  submitted: boolean
  handle: ComponentProps<'button'>
  actions: MenuAction[]
  update: (fn: (e: DEntry) => DEntry) => void
}

export function EntryCard({
  entry,
  name,
  showRest,
  inSuperset,
  submitted,
  handle,
  actions,
  update,
}: EntryCardProps) {
  const { t } = useI18n()
  const p = t.planner
  const [quick, setQuick] = useState({ n: '3', reps: '10', rir: '2' })
  const [confirmingGenerate, setConfirmingGenerate] = useState(false)

  const setField = (key: string, field: 'reps' | 'rir', v: string) =>
    update((e) => ({
      ...e,
      manual: true,
      sets: e.sets.map((s) => (s.key === key ? { ...s, [field]: v } : s)),
    }))

  // "N × reps, RIR": reps e RIR lasciati vuoti restano vuoti nelle serie (mai 0)
  const quickN = parseIntIn(quick.n, 1, 20)
  const quickOk = quickN !== null && !repsBad(quick.reps) && !rirBad(quick.rir)

  const generate = () => {
    setConfirmingGenerate(false)
    if (quickN === null || !quickOk) return
    const sets = expandSets(
      quickN,
      parseIntIn(quick.reps, 1, 999),
      parseIntIn(quick.rir, 0, 10),
    )
    update((e) => ({
      ...e,
      manual: false,
      sets: sets.map((s) => ({
        key: newId(),
        reps: s.reps === undefined ? '' : String(s.reps),
        rir: s.rir === undefined ? '' : String(s.rir),
      })),
    }))
  }

  const restError = entry.rest.trim() !== '' && parseMmSs(entry.rest) === null

  return (
    <div className="tp-entry">
      <div className="tp-entry-h">
        <button
          type="button"
          className="tp-handle"
          aria-label={p.dragHandle}
          title={p.dragHandle}
          {...handle}
        >
          ⠿
        </button>
        <b className="tp-entry-name">{name}</b>
        <ActionMenu label={p.exerciseMenu} actions={actions} />
      </div>

      <table className="tp-sets">
        <thead>
          <tr>
            <th>{p.setNo}</th>
            <th>{p.reps}</th>
            <th>RIR</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entry.sets.map((s, i) => (
            <tr key={s.key}>
              <td className="tp-n">{i + 1}</td>
              {(['reps', 'rir'] as const).map((f) => {
                const bad =
                  submitted && (f === 'reps' ? repsBad(s.reps) : rirBad(s.rir))
                return (
                  <td key={f}>
                    <input
                      className="pl-inp pl-num"
                      inputMode="numeric"
                      value={s[f]}
                      aria-label={`${f === 'reps' ? p.reps : 'RIR'} – ${p.setNo} ${i + 1}`}
                      aria-invalid={bad}
                      onChange={(e) => setField(s.key, f, e.target.value)}
                    />
                  </td>
                )
              })}
              <td className="tp-row-actions">
                <span className="tp-ra">
                  <button
                    type="button"
                    className="pl-ico pl-ico-static"
                    title={p.duplicateSet}
                    aria-label={`${p.duplicateSet} ${i + 1}`}
                    onClick={() =>
                      update((e) => ({
                        ...e,
                        sets: e.sets.flatMap((x) =>
                          x.key === s.key ? [x, { ...x, key: newId() }] : [x],
                        ),
                      }))
                    }
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    className="pl-ico pl-ico-static"
                    title={p.deleteSet}
                    aria-label={`${p.deleteSet} ${i + 1}`}
                    disabled={entry.sets.length === 1}
                    onClick={() =>
                      update((e) => ({
                        ...e,
                        sets: e.sets.filter((x) => x.key !== s.key),
                      }))
                    }
                  >
                    ✕
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="tp-tools">
        <button
          type="button"
          className="pl-btn pl-small"
          onClick={() =>
            update((e) => {
              const last = e.sets[e.sets.length - 1] ?? blankSet()
              return { ...e, sets: [...e.sets, { ...last, key: newId() }] }
            })
          }
        >
          + {p.addSet}
        </button>
        <span className="tp-quick" role="group" aria-label={p.quickLabel}>
          <input
            className="pl-inp pl-num"
            inputMode="numeric"
            value={quick.n}
            aria-label={p.quickSets}
            aria-invalid={quickN === null}
            onChange={(e) => setQuick({ ...quick, n: e.target.value })}
          />
          ×
          <input
            className="pl-inp pl-num"
            inputMode="numeric"
            value={quick.reps}
            aria-label={p.reps}
            aria-invalid={repsBad(quick.reps)}
            onChange={(e) => setQuick({ ...quick, reps: e.target.value })}
          />
          {p.reps.toLowerCase()}, RIR
          <input
            className="pl-inp pl-num"
            inputMode="numeric"
            value={quick.rir}
            aria-label="RIR"
            aria-invalid={rirBad(quick.rir)}
            onChange={(e) => setQuick({ ...quick, rir: e.target.value })}
          />
          <button
            type="button"
            className="pl-btn pl-small"
            disabled={!quickOk}
            onClick={() =>
              entry.manual ? setConfirmingGenerate(true) : generate()
            }
          >
            {p.generate}
          </button>
        </span>
      </div>
      {confirmingGenerate && (
        <div className="pl-confirm tp-confirm" role="alert">
          <small>{p.confirmGenerate}</small>
          <button
            type="button"
            className="pl-btn warn pl-small"
            onClick={generate}
          >
            {p.confirmGenerateYes}
          </button>
          <button
            type="button"
            className="pl-btn pl-small"
            onClick={() => setConfirmingGenerate(false)}
          >
            {p.cancel}
          </button>
        </div>
      )}

      <div className="tp-meta">
        {showRest ? (
          <label className="tp-rest">
            <span>{inSuperset ? p.restAfterRound : p.restLabelShort}</span>
            <input
              className="pl-inp pl-short"
              value={entry.rest}
              inputMode="numeric"
              placeholder={formatMmSs(DEFAULT_REST_SECONDS)}
              aria-invalid={submitted && restError}
              onChange={(e) =>
                update((en) => ({ ...en, rest: e.target.value }))
              }
            />
          </label>
        ) : (
          <small className="tp-hint">{p.restInSuperset}</small>
        )}
        <label className="tp-note">
          <span>{p.notes}</span>
          <input
            className="pl-inp"
            value={entry.notes}
            onChange={(e) => update((en) => ({ ...en, notes: e.target.value }))}
          />
        </label>
      </div>
    </div>
  )
}
