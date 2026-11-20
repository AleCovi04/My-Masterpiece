import { useStoreHealth } from '../data'
import { useI18n } from '../i18n/context'

/** Avviso fisso quando il salvataggio del dispositivo non funziona (mai solo in console). */
export default function StoreAlert() {
  const { t } = useI18n()
  const v = t.storage
  const health = useStoreHealth()
  const problem =
    health.mode === 'newer'
      ? { title: v.newerTitle, text: v.newer }
      : health.mode === 'memory'
        ? { title: v.memoryTitle, text: v.memory }
        : health.writeFailed
          ? { title: v.writeTitle, text: v.write }
          : null
  if (!problem) return null
  return (
    <div className="store-alert" role="alert">
      <p>
        <b>{problem.title}</b> {problem.text}
      </p>
      <button
        type="button"
        className="pl-btn"
        onClick={() => window.location.reload()}
      >
        {v.reload}
      </button>
    </div>
  )
}
