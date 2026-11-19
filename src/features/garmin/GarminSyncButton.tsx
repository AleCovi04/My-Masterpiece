import { useI18n } from '../../i18n/context'
import { summarize } from './importer'
import { syncGarmin, useGarminSync } from './sync'
import './garmin.css'

/** "Sincronizza Garmin" (Calendario) con l'esito dell'ultima sincronizzazione. */
export default function GarminSyncButton() {
  const { t } = useI18n()
  const g = t.garmin
  const { running, last } = useGarminSync()

  let text: string | null = null
  if (last?.error === 'notLinked') text = g.syncNotLinked
  else if (last?.error === 'auth') text = g.icuBadLogin
  else if (last?.error === 'offline') text = g.icuOffline
  else if (last) {
    const s = summarize(last.results)
    const parts = [
      s.imported && g.resImported.replace('{n}', String(s.imported)),
      s.created && g.resCreated.replace('{n}', String(s.created)),
      s.invalid && g.resInvalid.replace('{n}', String(s.invalid)),
    ].filter(Boolean)
    text = parts.length ? parts.join(' ') : g.syncNone
  }

  return (
    <div className="gm-sync">
      <button
        type="button"
        className="pl-btn"
        disabled={running}
        onClick={() => void syncGarmin()}
      >
        {running ? g.syncing : g.sync}
      </button>
      {text && !running && (
        <small role="status" className={last?.error ? 'gm-err' : undefined}>
          {text}
        </small>
      )}
    </div>
  )
}
