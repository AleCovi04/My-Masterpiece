import { useState, type ReactNode } from 'react'
import type { Id, Session } from '../../data/types'
import { useI18n } from '../../i18n/context'
import type { FitActivity } from '../../lib/fit/types'
import { formatClock, formatDist } from '../../lib/enduranceTemplate'
import { sessionDurationSec } from '../../lib/sessions'
import Modal from '../planner/Modal'
import '../planner/planner.css'
import './garmin.css'
import {
  importFiles,
  summarize,
  type ImportOptions,
  type ImportResult,
} from './importer'

interface Choice {
  act: FitActivity
  candidates: Session[]
  resolve: (id: Id | null | undefined) => void
}

/**
 * Import di file Garmin con le finestre che servono: scelta della seduta
 * (se più d'una è adatta) e riepilogo finale.
 */
export function useGarminImport(onDone?: (results: ImportResult[]) => void) {
  const { t } = useI18n()
  const g = t.garmin
  const [choice, setChoice] = useState<Choice | null>(null)
  const [results, setResults] = useState<ImportResult[] | null>(null)
  const [busy, setBusy] = useState(false)

  const choose: ImportOptions['choose'] = (act, candidates) =>
    new Promise((resolve) => setChoice({ act, candidates, resolve }))

  const run = async (files: File[], targetId?: Id) => {
    if (!files.length) return
    setBusy(true)
    try {
      const out = await importFiles(files, {
        source: 'file',
        targetId,
        choose,
      })
      // un solo file importato dal dettaglio: niente riepilogo
      if (!(targetId && out.length === 1 && out[0].status === 'imported'))
        setResults(out)
      onDone?.(out)
    } finally {
      setBusy(false)
    }
  }

  const pick = (id: Id | null | undefined) => {
    choice?.resolve(id)
    setChoice(null)
  }

  const s = results ? summarize(results) : null
  const element: ReactNode = (
    <>
      {choice && (
        <Modal
          title={g.chooseTitle}
          closeLabel={g.cancel}
          onClose={() => pick(undefined)}
        >
          <p className="gm-hint">{g.chooseIntro}</p>
          <ul className="gm-choices">
            {choice.candidates.map((c) => {
              const sec = sessionDurationSec(c)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className="pl-btn gm-choice"
                    onClick={() => pick(c.id)}
                  >
                    <b>{c.name ?? t.discipline[c.discipline]}</b>
                    <small>
                      {t.status[c.status]}
                      {sec ? ` · ${formatClock(sec)}` : ''}
                    </small>
                  </button>
                </li>
              )
            })}
            <li>
              <button
                type="button"
                className="pl-btn gm-choice"
                onClick={() => pick(null)}
              >
                <b>{g.newSession}</b>
                <small>
                  {choice.act.sessions
                    .map(
                      (x) =>
                        `${t.discipline[x.discipline]}${x.distanceM ? ` ${formatDist(x.distanceM, x.discipline)}` : ''}`,
                    )
                    .join(' + ')}
                </small>
              </button>
            </li>
          </ul>
        </Modal>
      )}
      {s && (
        <Modal
          title={g.resultTitle}
          closeLabel={g.close}
          onClose={() => setResults(null)}
        >
          <ul className="gm-result">
            {s.imported > 0 && (
              <li>
                {g.resImported.replace('{n}', String(s.imported))}
                {s.created > 0 &&
                  ` ${g.resCreated.replace('{n}', String(s.created))}`}
              </li>
            )}
            {s.duplicate > 0 && (
              <li>{g.resDuplicate.replace('{n}', String(s.duplicate))}</li>
            )}
            {s.mismatch > 0 && <li>{g.resMismatch}</li>}
            {s.ignored > 0 && (
              <li>{g.resIgnored.replace('{n}', String(s.ignored))}</li>
            )}
            {s.invalid > 0 && (
              <li>{g.resInvalid.replace('{n}', String(s.invalid))}</li>
            )}
            {s.skipped > 0 && (
              <li>{g.resSkipped.replace('{n}', String(s.skipped))}</li>
            )}
            {s.imported > 0 && <li className="gm-hint">{g.rpeReminder}</li>}
          </ul>
          <div className="pl-actions">
            <button
              type="button"
              className="pl-btn acc"
              onClick={() => setResults(null)}
            >
              {g.close}
            </button>
          </div>
        </Modal>
      )}
    </>
  )

  return { run, busy, element, choose }
}
