import { Capacitor } from '@capacitor/core'
import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/ui/Modal'
import { account, dataStore, refreshData } from '../../data'
import type { ImportRecord, Session } from '../../data/types'
import { useI18n } from '../../i18n/context'
import {
  ARCHIVE_YEARS,
  archiveCandidates,
  archiveCutoff,
  archiveEntryName,
  archiveFileName,
  buildArchive,
  DEFAULT_ARCHIVE_YEARS,
} from '../../lib/fitArchive'
import { formatBytes } from '../../lib/space'

type Step =
  | { kind: 'choose' }
  | { kind: 'preparing'; done: number; total: number }
  | { kind: 'ready'; zip: Uint8Array; ids: string[]; missing: number }
  | { kind: 'saved'; ids: string[] }
  | { kind: 'working' }
  | { kind: 'done'; count: number }
  | { kind: 'error'; message: string }

/**
 * Livello 2 di docs/spazio-dati.md: scarica in uno .zip i FIT più vecchi di N
 * anni, poi li toglie dal server e dalla cache. Riepilogo e giri restano.
 */
export default function ArchiveDialog({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n()
  const a = t.archive
  const [years, setYears] = useState<number>(DEFAULT_ARCHIVE_YEARS)
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [step, setStep] = useState<Step>({ kind: 'choose' })
  const native = Capacitor.isNativePlatform()

  useEffect(() => {
    void Promise.all([dataStore.loadImports(), dataStore.loadSessions()]).then(
      ([i, s]) => {
        setImports(i)
        setSessions(s)
      },
    )
  }, [])

  const cutoff = useMemo(() => archiveCutoff(new Date(), years), [years])
  const candidates = useMemo(
    () => archiveCandidates(imports, cutoff),
    [imports, cutoff],
  )

  const prepare = async () => {
    setStep({ kind: 'preparing', done: 0, total: candidates.length })
    const entries: { name: string; bytes: Uint8Array }[] = []
    const ids: string[] = []
    let missing = 0
    for (const [i, r] of candidates.entries()) {
      const bytes = await account.getFitFile(r.id).catch(() => null)
      if (bytes) {
        entries.push({ name: archiveEntryName(r, sessions), bytes })
        ids.push(r.id)
      } else missing += 1
      setStep({ kind: 'preparing', done: i + 1, total: candidates.length })
    }
    if (ids.length === 0) {
      setStep({ kind: 'error', message: a.nothingDownloaded })
      return
    }
    setStep({ kind: 'ready', zip: buildArchive(entries), ids, missing })
  }

  const download = (zip: Uint8Array, ids: string[]) => {
    const url = URL.createObjectURL(
      new Blob([zip as BlobPart], { type: 'application/zip' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = archiveFileName(cutoff)
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setStep({ kind: 'saved', ids })
  }

  const free = async (ids: string[]) => {
    setStep({ kind: 'working' })
    try {
      await account.archiveFitFiles(ids)
      const stamp = new Date().toISOString()
      const set = new Set(ids)
      const latest = await dataStore.loadImports()
      await dataStore.saveImports(
        latest.map((r) =>
          set.has(r.id) ? { ...r, archived: true, updatedAt: stamp } : r,
        ),
      )
      refreshData()
      setStep({ kind: 'done', count: ids.length })
    } catch (e) {
      console.error(e)
      setStep({
        kind: 'error',
        message: e instanceof Error ? e.message : a.failed,
      })
    }
  }

  const busy = step.kind === 'preparing' || step.kind === 'working'

  return (
    <Modal
      title={a.title}
      closeLabel={t.data.close}
      onClose={busy ? () => {} : onClose}
      backdropClose={false}
    >
      <p>{a.intro}</p>
      {native ? (
        <p className="dt-notice err">{a.useComputer}</p>
      ) : (
        <>
          {step.kind === 'choose' && (
            <>
              <label className="pl-fld">
                <span>{a.olderThan}</span>
                <select
                  className="pl-inp pl-short"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                >
                  {ARCHIVE_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {a.years.replace('{n}', String(y))}
                    </option>
                  ))}
                </select>
              </label>
              <p className="dt-meta">
                {candidates.length === 0
                  ? a.none
                  : a.count.replace('{n}', String(candidates.length))}
              </p>
              <div className="pl-actions">
                <button
                  type="button"
                  className="pl-btn acc"
                  disabled={candidates.length === 0}
                  onClick={() => void prepare()}
                >
                  {a.prepare}
                </button>
              </div>
            </>
          )}
          {step.kind === 'preparing' && (
            <p className="dt-meta">
              {a.preparing
                .replace('{done}', String(step.done))
                .replace('{total}', String(step.total))}
            </p>
          )}
          {step.kind === 'ready' && (
            <>
              <p className="dt-meta">
                {a.ready
                  .replace('{n}', String(step.ids.length))
                  .replace('{size}', formatBytes(step.zip.length, lang))}
              </p>
              {step.missing > 0 && (
                <p className="dt-meta">
                  {a.missing.replace('{n}', String(step.missing))}
                </p>
              )}
              <div className="pl-actions">
                <button
                  type="button"
                  className="pl-btn acc"
                  onClick={() => download(step.zip, step.ids)}
                >
                  {a.download}
                </button>
              </div>
            </>
          )}
          {step.kind === 'saved' && (
            <>
              <p className="dt-notice">{a.checkSaved}</p>
              <div className="pl-actions">
                <button
                  type="button"
                  className="pl-btn warn"
                  onClick={() => void free(step.ids)}
                >
                  {a.free.replace('{n}', String(step.ids.length))}
                </button>
              </div>
            </>
          )}
          {step.kind === 'working' && <p className="dt-meta">{a.working}</p>}
          {step.kind === 'done' && (
            <p className="dt-notice ok">
              {a.done.replace('{n}', String(step.count))}
            </p>
          )}
          {step.kind === 'error' && (
            <p className="dt-notice err">{step.message}</p>
          )}
        </>
      )}
    </Modal>
  )
}
