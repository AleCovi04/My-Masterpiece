import { useEffect, useState } from 'react'
import { account, dataStore, useAccount, useDataRevision } from '../../data'
import { useI18n } from '../../i18n/context'
import ArchiveDialog from './ArchiveDialog'
import {
  estimateDbBytes,
  formatBytes,
  FREE_DB_BYTES,
  FREE_STORAGE_BYTES,
  spaceLevel,
  spacePct,
} from '../../lib/space'

interface Usage {
  /** Stima dei dati sul database. */
  dbBytes: number
  /** File FIT sul server; `null` se non leggibili (offline). */
  fit: { count: number; bytes: number } | null
}

/** Spazio occupato sul server rispetto ai limiti del piano gratuito (solo con account). */
export default function SpaceCard() {
  const { t, lang } = useI18n()
  const s = t.space
  const { email } = useAccount()
  const revision = useDataRevision()
  const [usage, setUsage] = useState<Usage | null>(null)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    if (!email) return
    let cancelled = false
    void (async () => {
      const file = await dataStore.exportAll()
      const dbBytes = estimateDbBytes(JSON.stringify(file).length)
      const fit = await account.fitUsage().catch(() => null)
      if (!cancelled) setUsage({ dbBytes, fit })
    })()
    return () => {
      cancelled = true
    }
  }, [email, revision])

  if (!email || !usage) return null

  const row = (label: string, used: number, limit: number, note: string) => {
    const level = spaceLevel(used, limit)
    return (
      <div className={`dt-space ${level}`}>
        <div className="dt-space-h">
          <span>{label}</span>
          <b>
            {formatBytes(used, lang)} / {formatBytes(limit, lang)}
          </b>
        </div>
        <div className="dt-space-bar" aria-hidden="true">
          <i style={{ width: `${Math.max(1, spacePct(used, limit))}%` }} />
        </div>
        <small>{note}</small>
      </div>
    )
  }

  const worst = [
    spaceLevel(usage.dbBytes, FREE_DB_BYTES),
    usage.fit ? spaceLevel(usage.fit.bytes, FREE_STORAGE_BYTES) : 'ok',
  ]
  const advice = worst.includes('high')
    ? s.high
    : worst.includes('warn')
      ? s.warn
      : s.ok

  return (
    <section className="dt-card">
      <h2>{s.title}</h2>
      {row(s.data, usage.dbBytes, FREE_DB_BYTES, s.dataNote)}
      {usage.fit ? (
        row(
          s.files,
          usage.fit.bytes,
          FREE_STORAGE_BYTES,
          s.filesNote.replace('{n}', String(usage.fit.count)),
        )
      ) : (
        <p className="dt-meta">{s.filesUnavailable}</p>
      )}
      <p className="dt-meta">{advice}</p>
      {usage.fit && usage.fit.count > 0 && (
        <div className="dt-actions">
          <button
            type="button"
            className="pl-btn"
            onClick={() => setArchiving(true)}
          >
            {s.freeUp}
          </button>
        </div>
      )}
      {archiving && <ArchiveDialog onClose={() => setArchiving(false)} />}
    </section>
  )
}
