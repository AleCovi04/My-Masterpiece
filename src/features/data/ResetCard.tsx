import { useState } from 'react'
import Modal from '../../components/ui/Modal'
import {
  account,
  dataStore,
  refreshData,
  useAccount,
  useStoreOk,
} from '../../data'
import { useI18n } from '../../i18n/context'
import { toolError } from './toolError'

type Phase = 'idle' | 'confirm' | 'working' | 'done' | 'error'

/** "Ricomincia da zero": cancella tutti i dati, sul dispositivo e (con account) sul server. */
export default function ResetCard() {
  const { t } = useI18n()
  const r = t.reset
  const { email } = useAccount()
  const [phase, setPhase] = useState<Phase>('idle')
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')

  const storeOk = useStoreOk()
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  const blocked = (!!email && offline) || !storeOk
  const confirmed = typed.trim().toUpperCase() === r.word

  const run = async () => {
    setPhase('working')
    try {
      await dataStore.resetAll()
      refreshData()
      await account.resetServer()
      setPhase('done')
    } catch (e) {
      console.error(e)
      setError(toolError(e, t))
      setPhase('error')
    }
  }

  const close = () => {
    if (phase === 'working') return
    setPhase('idle')
    setTyped('')
  }

  return (
    <section className="dt-card dt-danger">
      <h2>{r.title}</h2>
      <p>{email ? r.introAccount : r.introLocal}</p>
      <ul className="dt-list">
        <li>{r.deleted}</li>
        <li>{r.kept}</li>
      </ul>
      {!storeOk ? (
        <p className="dt-meta">{t.storage.toolsBlocked}</p>
      ) : (
        blocked && <p className="dt-meta">{r.offline}</p>
      )}
      <div className="dt-actions">
        <button
          type="button"
          className="pl-btn warn"
          disabled={blocked}
          onClick={() => setPhase('confirm')}
        >
          {r.button}
        </button>
      </div>

      {phase !== 'idle' && (
        <Modal
          title={r.title}
          closeLabel={t.data.close}
          onClose={close}
          backdropClose={false}
        >
          {phase === 'confirm' && (
            <>
              <p>{r.confirmText}</p>
              <label className="pl-fld">
                <span>{r.typeWord.replace('{word}', r.word)}</span>
                <input
                  className="pl-inp pl-short"
                  value={typed}
                  autoFocus
                  autoComplete="off"
                  onChange={(e) => setTyped(e.target.value)}
                />
              </label>
              <div className="pl-actions">
                <button
                  type="button"
                  className="pl-btn warn"
                  disabled={!confirmed}
                  onClick={() => void run()}
                >
                  {r.confirmButton}
                </button>
                <button type="button" className="pl-btn" onClick={close}>
                  {r.cancel}
                </button>
              </div>
            </>
          )}
          {phase === 'working' && <p className="dt-meta">{r.working}</p>}
          {phase === 'done' && (
            <p className="dt-notice ok">
              {email ? r.doneAccount : r.doneLocal}
            </p>
          )}
          {phase === 'error' && (
            <p className="dt-notice err">
              {r.serverFailed.replace('{error}', error)}
            </p>
          )}
        </Modal>
      )}
    </section>
  )
}
