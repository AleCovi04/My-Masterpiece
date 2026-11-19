import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { Grid } from '../../components/layout'
import { dataStore } from '../../data'
import {
  exportFileName,
  parseImportFile,
  type ImportResult,
} from '../../data/exportFile'
import { SCHEMA_VERSION } from '../../data/migrations'
import type { BackupInfo } from '../../data/store'
import type { DataCounts, IsoDateTime } from '../../data/types'
import { useI18n } from '../../i18n/context'
import Modal from '../planner/Modal'
import '../planner/planner.css'
import GarminCards from '../garmin/GarminCards'
import AccountCard from './AccountCard'
import './data.css'

/** Promemoria se l'ultimo export manuale ha più di questi giorni. */
const EXPORT_REMINDER_DAYS = 30
const DAY_MS = 864e5

interface Info {
  backups: BackupInfo[]
  lastExportAt: IsoDateTime | null
  persistent: boolean
  /** Giorni dall'ultimo export; `null` = mai fatto. */
  exportAgeDays: number | null
}

async function loadInfo(): Promise<Info> {
  const [backups, lastExportAt, persistent] = await Promise.all([
    dataStore.listBackups(),
    dataStore.lastExportAt(),
    dataStore.isPersistent(),
  ])
  return {
    backups,
    lastExportAt,
    persistent,
    exportAgeDays: lastExportAt
      ? (Date.now() - Date.parse(lastExportAt)) / DAY_MS
      : null,
  }
}

type Preview = Extract<ImportResult, { ok: true }> & { fileName: string }
type Notice = { kind: 'ok' | 'err'; text: string }

export default function DataPage() {
  const { t, lang } = useI18n()
  const d = t.data
  const [info, setInfo] = useState<Info | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [restoring, setRestoring] = useState<number | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(() => loadInfo().then(setInfo), [])

  useEffect(() => {
    let cancelled = false
    loadInfo().then((i) => {
      if (!cancelled) setInfo(i)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const dateTime = (iso: IsoDateTime) =>
    new Date(iso).toLocaleString(lang === 'it' ? 'it-IT' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  const counts = (c: DataCounts) =>
    `${c.exercises} ${d.exercises} · ${c.templates} ${d.templates} · ${c.sessions} ${d.sessions}` +
    (c.blocks || c.phases
      ? ` · ${c.blocks} ${d.blocks} · ${c.phases} ${d.phases}`
      : '')

  /** Esegue un'operazione sui dati mostrando l'esito. */
  const run = async (action: () => Promise<void>, done?: string) => {
    setBusy(true)
    setNotice(null)
    try {
      await action()
      if (done) setNotice({ kind: 'ok', text: done })
    } catch (error) {
      console.error(error)
      setNotice({ kind: 'err', text: d.failed })
    } finally {
      setBusy(false)
      await refresh()
    }
  }

  const exportAll = () =>
    run(async () => {
      const file = await dataStore.exportAll()
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }),
      )
      const a = document.createElement('a')
      a.href = url
      a.download = exportFileName(new Date())
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      await dataStore.markExported()
    })

  const chooseFile = async (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0]
    ev.target.value = '' // lo stesso file si può scegliere di nuovo
    if (!file) return
    setNotice(null)
    const result = parseImportFile(await file.text())
    if (result.ok) {
      setPreview({ ...result, fileName: file.name })
    } else {
      setNotice({
        kind: 'err',
        text: result.error === 'newer' ? d.importNewer : d.importInvalid,
      })
    }
  }

  const confirmImport = () => {
    if (!preview) return
    const { data } = preview
    setPreview(null)
    void run(() => dataStore.replaceAll(data), d.imported)
  }

  const restore = (id: number) => {
    setRestoring(null)
    void run(() => dataStore.restoreBackup(id), d.restored)
  }

  const reminder = !info
    ? null
    : info.exportAgeDays === null
      ? d.exportNeverReminder
      : info.exportAgeDays > EXPORT_REMINDER_DAYS
        ? d.exportReminder
        : null

  return (
    <div className="dt">
      <h1 className="pl-title">{d.title}</h1>
      <p className="dt-intro">
        {d.intro}
        {info && <> {info.persistent ? d.persistent : d.notPersistent}</>}
      </p>

      {notice && (
        <p
          className={`dt-notice ${notice.kind}`}
          role={notice.kind === 'err' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}

      <AccountCard dateTime={dateTime} />

      <Grid cols={2}>
        <section className="dt-card">
          <h2>{d.exportTitle}</h2>
          <p>{d.exportHint}</p>
          <p className="dt-meta">
            {d.lastExport}:{' '}
            <b>{info?.lastExportAt ? dateTime(info.lastExportAt) : d.never}</b>
          </p>
          {reminder && <p className="dt-reminder">{reminder}</p>}
          <div className="dt-actions">
            <button
              type="button"
              className="pl-btn acc"
              disabled={busy}
              onClick={() => void exportAll()}
            >
              {d.exportAll}
            </button>
          </div>
        </section>

        <section className="dt-card">
          <h2>{d.importTitle}</h2>
          <p>{d.importHint}</p>
          <div className="dt-actions">
            <button
              type="button"
              className="pl-btn"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {d.importChoose}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(ev) => void chooseFile(ev)}
            />
          </div>
        </section>
      </Grid>

      <GarminCards dateTime={dateTime} />

      <section className="dt-card">
        <h2>{d.backupsTitle}</h2>
        <p>{d.backupsHint}</p>
        {info && info.backups.length === 0 ? (
          <div className="ph">{d.noBackups}</div>
        ) : (
          <ul className="dt-backups">
            {info?.backups.map((b) => (
              <li key={b.id}>
                <span className="dt-b-main">
                  <b>{dateTime(b.createdAt)}</b>
                  <small>
                    {d.reason[b.reason]} · {counts(b.counts)}
                  </small>
                </span>
                {restoring === b.id ? (
                  <span className="pl-confirm">
                    <small>{d.confirmRestore}</small>
                    <button
                      type="button"
                      className="pl-btn warn pl-small"
                      onClick={() => restore(b.id)}
                    >
                      {d.restoreYes}
                    </button>
                    <button
                      type="button"
                      className="pl-btn pl-small"
                      onClick={() => setRestoring(null)}
                    >
                      {d.cancel}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="pl-btn pl-small"
                    disabled={busy}
                    onClick={() => setRestoring(b.id)}
                  >
                    {d.restore}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="dt-foot">
        {d.schemaVersion}: {SCHEMA_VERSION}
      </p>

      {preview && (
        <Modal
          title={d.previewTitle}
          closeLabel={d.close}
          onClose={() => setPreview(null)}
          backdropClose={false}
        >
          <div className="dt-preview">
            <dl>
              <div>
                <dt>{d.previewFile}</dt>
                <dd>{preview.fileName}</dd>
              </div>
              {preview.exportedAt && (
                <div>
                  <dt>{d.previewDate}</dt>
                  <dd>{dateTime(preview.exportedAt)}</dd>
                </div>
              )}
              <div>
                <dt>{d.previewVersion}</dt>
                <dd>
                  {preview.fromVersion}
                  {preview.fromVersion < SCHEMA_VERSION &&
                    ` (${d.previewMigrated} ${SCHEMA_VERSION})`}
                </dd>
              </div>
            </dl>
            <ul className="dt-counts">
              <li>
                <b>{preview.counts.exercises}</b> {d.exercises}
              </li>
              <li>
                <b>{preview.counts.templates}</b> {d.templates}
              </li>
              <li>
                <b>{preview.counts.sessions}</b> {d.sessions}
              </li>
              <li>
                <b>{preview.counts.blocks}</b> {d.blocks}
              </li>
              <li>
                <b>{preview.counts.phases}</b> {d.phases}
              </li>
            </ul>
            {preview.dropped > 0 && (
              <p className="dt-reminder">
                {preview.dropped} {d.dropped}
              </p>
            )}
            <p>{d.confirmReplace}</p>
            <div className="pl-actions">
              <button
                type="button"
                className="pl-btn"
                onClick={() => setPreview(null)}
              >
                {d.cancel}
              </button>
              <button
                type="button"
                className="pl-btn warn"
                onClick={confirmImport}
              >
                {d.replace}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
