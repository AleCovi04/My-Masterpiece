import { useI18n } from '../../i18n/context'
import { summarize } from './importer'
import { checkGarmin, useGarminSync } from './sync'
import './garmin.css'

/** "Sincronizza Garmin" (Calendario): apre la finestra "Collega" con le attività degli ultimi 30 giorni. */
export default function GarminSyncButton() {
  const { t } = useI18n()
  const g = t.garmin
  const { running, linking, last } = useGarminSync()
  const busy = running || linking

  let text: string | null = null
  if (last?.error === 'notLinked') text = g.syncNotLinked
  else if (last?.error === 'auth') text = g.icuBadLogin
  else if (last?.error === 'offline') text = g.icuOffline
  else if (last?.none) text = g.syncNone
  else if (last?.results) {
    const s = summarize(last.results)
    const parts = [
      s.imported && g.resImported.replace('{n}', String(s.imported)),
      s.created && g.resCreated.replace('{n}', String(s.created)),
      s.duplicate && g.resDuplicate.replace('{n}', String(s.duplicate)),
      s.invalid && g.resInvalid.replace('{n}', String(s.invalid)),
    ].filter(Boolean)
    text = parts.length ? parts.join(' ') : null
  }

  return (
    <div className="gm-sync">
      <button
        type="button"
        className="pl-btn"
        disabled={busy}
        onClick={() => void checkGarmin(true)}
      >
        {busy ? g.syncing : g.sync}
      </button>
      {text && !busy && (
        <small role="status" className={last?.error ? 'gm-err' : undefined}>
          {text}
        </small>
      )}
    </div>
  )
}
