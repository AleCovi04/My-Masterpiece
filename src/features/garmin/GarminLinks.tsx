import { useEffect, useState } from 'react'
import type { Id, Session } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { formatClock, formatDist } from '../../lib/enduranceTemplate'
import type { LinkProposal } from '../../lib/garminLink'
import Modal from '../planner/Modal'
import '../planner/planner.css'
import './garmin.css'
import {
  checkGarmin,
  closeGarminLinks,
  ignoreGarminActivity,
  linkGarmin,
  useGarminSync,
} from './sync'

/** Valore del menu per "nuova seduta". */
const NEW = ''

/**
 * Nella cornice dell'app: all'apertura e al ritorno visibile cerca su
 * intervals.icu le attività da collegare e mostra la finestra "Collega".
 */
export default function GarminLinks() {
  const { open, rows } = useGarminSync()

  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible') void checkGarmin()
    }
    // dopo l'avvio, senza rallentarlo
    const timer = setTimeout(check, 3000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  if (!open || !rows.length) return null
  // nuove righe = scelte iniziali da capo
  return (
    <LinkDialog
      key={rows.map((r) => r.activity.id).join()}
      rows={rows}
      manual={open === 'manual'}
    />
  )
}

interface Pick {
  on: boolean
  target: Id | typeof NEW
}

function LinkDialog({
  rows,
  manual,
}: {
  rows: LinkProposal[]
  manual: boolean
}) {
  const { t, lang } = useI18n()
  const g = t.garmin
  const { linking } = useGarminSync()
  const [picks, setPicks] = useState<Record<string, Pick>>(() =>
    Object.fromEntries(
      rows.map((r) => [
        r.activity.id,
        { on: r.target !== null, target: r.target ?? NEW },
      ]),
    ),
  )
  const locale = lang === 'it' ? 'it-IT' : 'en-GB'

  const update = (id: string, patch: Partial<Pick>) =>
    setPicks((p) => ({ ...p, [id]: { ...p[id], ...patch } }))

  const chosen = rows.filter((r) => picks[r.activity.id]?.on)
  const confirm = () =>
    void linkGarmin(
      chosen.map((row) => ({
        row,
        target: picks[row.activity.id].target || null,
      })),
    )

  const sessionLabel = (s: Session) =>
    `${s.name ?? t.discipline[s.discipline]}${s.status === 'done' ? ` · ${g.linkDoneManual}` : ''}`

  return (
    <Modal
      title={g.linkTitle}
      closeLabel={g.linkLater}
      onClose={closeGarminLinks}
      backdropClose={false}
    >
      <p className="gm-hint">{manual ? g.linkIntroManual : g.linkIntro}</p>
      <ul className="gm-links">
        {rows.map((r) => {
          const a = r.activity
          const pick = picks[a.id]
          const start = a.startLocal ? new Date(a.startLocal) : null
          const when = start
            ? start.toLocaleDateString(locale, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              }) +
              ', ' +
              start.toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
              })
            : r.date
          const facts = [
            a.distanceM && formatDist(Math.round(a.distanceM), r.discipline),
            a.movingS && formatClock(a.movingS),
          ].filter(Boolean)
          const options = manual ? [...r.candidates, null] : r.candidates
          const checkId = `gm-l-${a.id}`
          return (
            <li key={a.id} className={pick.on ? 'on' : undefined}>
              <input
                id={checkId}
                type="checkbox"
                checked={pick.on}
                disabled={linking}
                onChange={(e) => update(a.id, { on: e.target.checked })}
              />
              <label htmlFor={checkId} className="gm-link-src">
                <b>
                  {t.discipline[r.discipline]}
                  {facts.length ? ` · ${facts.join(' · ')}` : ''}
                </b>
                <small>
                  {when} · {g.linkFromGarmin}
                </small>
              </label>
              <span className="gm-link-arrow" aria-hidden="true">
                →
              </span>
              <div className="gm-link-dst">
                {options.length > 1 ? (
                  <select
                    aria-label={g.linkTarget}
                    value={pick.target}
                    disabled={linking}
                    onChange={(e) => update(a.id, { target: e.target.value })}
                  >
                    {options.map((s) =>
                      s ? (
                        <option key={s.id} value={s.id}>
                          {sessionLabel(s)}
                        </option>
                      ) : (
                        <option key="new" value={NEW}>
                          {g.newSession}
                        </option>
                      ),
                    )}
                  </select>
                ) : (
                  <span>
                    {options[0] ? sessionLabel(options[0]) : g.newSession}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="gm-link-x"
                aria-label={g.linkIgnore}
                title={g.linkIgnore}
                disabled={linking}
                onClick={() => void ignoreGarminActivity(r)}
              >
                ✕
              </button>
            </li>
          )
        })}
      </ul>
      <p className="gm-hint">{g.linkIgnoreHint}</p>
      <div className="pl-actions">
        <button
          type="button"
          className="pl-btn"
          disabled={linking}
          onClick={closeGarminLinks}
        >
          {g.linkLater}
        </button>
        <button
          type="button"
          className="pl-btn acc"
          disabled={linking || chosen.length === 0}
          onClick={confirm}
        >
          {linking
            ? g.linking
            : g.linkConfirm.replace('{n}', String(chosen.length))}
        </button>
      </div>
    </Modal>
  )
}
