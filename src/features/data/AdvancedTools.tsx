import { useState } from 'react'
import Modal from '../../components/ui/Modal'
import { account, useAccount, useStoreOk } from '../../data'
import { useI18n } from '../../i18n/context'
import { toolError } from './toolError'

type Phase = 'idle' | 'confirm' | 'working' | 'done' | 'error'

/** Strumenti di recupero, chiusi di default (docs/spazio-dati.md). */
export default function AdvancedTools() {
  const { t } = useI18n()
  const v = t.advanced
  const { email } = useAccount()
  const storeOk = useStoreOk()
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')

  if (!email) return null

  const rebuild = async () => {
    setPhase('working')
    try {
      await account.rebuildServer()
      setPhase('done')
    } catch (e) {
      console.error(e)
      setError(toolError(e, t))
      setPhase('error')
    }
  }

  return (
    <details className="dt-card dt-advanced">
      <summary>{v.title}</summary>
      <h3>{v.rebuildTitle}</h3>
      <p>{v.rebuildText}</p>
      {!storeOk && <p className="dt-meta">{t.storage.toolsBlocked}</p>}
      <div className="dt-actions">
        <button
          type="button"
          className="pl-btn"
          disabled={!storeOk}
          onClick={() => setPhase('confirm')}
        >
          {v.rebuildButton}
        </button>
      </div>

      {phase !== 'idle' && (
        <Modal
          title={v.rebuildTitle}
          closeLabel={t.data.close}
          onClose={() => phase !== 'working' && setPhase('idle')}
          backdropClose={false}
        >
          {phase === 'confirm' && (
            <>
              <p>{v.rebuildConfirm}</p>
              <div className="pl-actions">
                <button
                  type="button"
                  className="pl-btn warn"
                  onClick={() => void rebuild()}
                >
                  {v.rebuildButton}
                </button>
                <button
                  type="button"
                  className="pl-btn"
                  onClick={() => setPhase('idle')}
                >
                  {t.reset.cancel}
                </button>
              </div>
            </>
          )}
          {phase === 'working' && <p className="dt-meta">{v.working}</p>}
          {phase === 'done' && <p className="dt-notice ok">{v.done}</p>}
          {phase === 'error' && (
            <p className="dt-notice err">
              {v.failed.replace('{error}', error)}
            </p>
          )}
        </Modal>
      )}
    </details>
  )
}
