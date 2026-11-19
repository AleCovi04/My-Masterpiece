import { useEffect, useState, type FormEvent } from 'react'
import { dataStore, useDataRevision } from '../../data'
import type { IntervalsLink } from '../../data/store'
import type { IsoDateTime, Settings } from '../../data/types'
import { useI18n } from '../../i18n/context'
import { sanitizeSettings } from '../../data/validate'
import FitFileButton from './FitFileButton'
import { checkLink, IntervalsError } from './intervals'
import { useGarminImport } from './useGarminImport'
import './garmin.css'

/** Schede Garmin della pagina Dati: file, intervals.icu, soglie. */
export default function GarminCards({
  dateTime,
}: {
  dateTime: (iso: IsoDateTime) => string
}) {
  return (
    <>
      <FilesCard />
      <IntervalsCard dateTime={dateTime} />
      <ThresholdsCard />
    </>
  )
}

function FilesCard() {
  const { t } = useI18n()
  const g = t.garmin
  const garmin = useGarminImport()
  return (
    <section className="dt-card">
      <h2>{g.filesTitle}</h2>
      <p>{g.filesHint}</p>
      <div className="dt-actions">
        <FitFileButton
          label={g.filesChoose}
          busyLabel={g.importing}
          busy={garmin.busy}
          multiple
          onFiles={(files) => void garmin.run(files)}
        />
      </div>
      {garmin.element}
    </section>
  )
}

function IntervalsCard({
  dateTime,
}: {
  dateTime: (iso: IsoDateTime) => string
}) {
  const { t } = useI18n()
  const g = t.garmin
  const [link, setLink] = useState<IntervalsLink | null | undefined>(undefined)
  const [athleteId, setAthleteId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const revision = useDataRevision()

  useEffect(() => {
    let cancelled = false
    dataStore.loadIntervals().then((l) => {
      if (!cancelled) setLink(l)
    })
    return () => {
      cancelled = true
    }
  }, [revision, busy])

  const connect = async (ev: FormEvent) => {
    ev.preventDefault()
    const next = { athleteId: athleteId.trim(), apiKey: apiKey.trim() }
    if (!next.athleteId || !next.apiKey) return
    setBusy(true)
    setError(null)
    try {
      await checkLink(next)
      await dataStore.saveIntervals(next)
      setApiKey('')
    } catch (e) {
      setError(
        e instanceof IntervalsError && e.kind === 'auth'
          ? g.icuBadLogin
          : g.icuOffline,
      )
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    setBusy(true)
    await dataStore.saveIntervals(null)
    setBusy(false)
  }

  if (link === undefined) return null
  return (
    <section className="dt-card">
      <h2>{g.icuTitle}</h2>
      <p>{g.icuIntro}</p>
      {link ? (
        <>
          <p className="dt-meta">
            <b>{g.icuConnected.replace('{n}', link.athleteId)}</b>
            <br />
            {g.icuLastCheck}:{' '}
            {link.lastCheckAt ? dateTime(link.lastCheckAt) : g.icuNever}
          </p>
          <div className="dt-actions">
            <button
              type="button"
              className="pl-btn"
              disabled={busy}
              onClick={() => void disconnect()}
            >
              {g.icuDisconnect}
            </button>
          </div>
        </>
      ) : (
        <form className="gm-form" onSubmit={(ev) => void connect(ev)}>
          <p className="gm-hint">{g.icuWhere}</p>
          <label className="pl-fld">
            <span>{g.icuAthlete}</span>
            <input
              className="pl-inp"
              value={athleteId}
              autoComplete="off"
              placeholder="i123456"
              onChange={(e) => setAthleteId(e.target.value)}
            />
          </label>
          <label className="pl-fld">
            <span>{g.icuKey}</span>
            <input
              className="pl-inp"
              type="password"
              value={apiKey}
              autoComplete="off"
              onChange={(e) => setApiKey(e.target.value)}
            />
          </label>
          {error && (
            <p className="gm-err" role="alert">
              {error}
            </p>
          )}
          <p className="gm-hint">{g.icuLocal}</p>
          <div className="dt-actions">
            <button
              type="submit"
              className="pl-btn acc"
              disabled={busy || !athleteId.trim() || !apiKey.trim()}
            >
              {busy ? g.icuChecking : g.icuConnect}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

const toText = (v?: number) => (v === undefined ? '' : String(v))
const toNum = (s: string) => (s.trim() === '' ? undefined : Number(s.trim()))

function ThresholdsCard() {
  const { t } = useI18n()
  const g = t.garmin
  const [settings, setSettings] = useState<Settings | null>(null)
  const [maxHr, setMaxHr] = useState('')
  const [restHr, setRestHr] = useState('')
  const [ftp, setFtp] = useState('')
  const [notice, setNotice] = useState<'ok' | 'err' | null>(null)
  const revision = useDataRevision()

  useEffect(() => {
    let cancelled = false
    dataStore.loadSettings().then((s) => {
      if (cancelled) return
      setSettings(s)
      setMaxHr(toText(s.thresholds.maxHr))
      setRestHr(toText(s.thresholds.restHr))
      setFtp(toText(s.thresholds.ftp))
    })
    return () => {
      cancelled = true
    }
  }, [revision])

  const save = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!settings) return
    const wanted = {
      maxHr: toNum(maxHr),
      restHr: toNum(restHr),
      ftp: toNum(ftp),
    }
    const clean = sanitizeSettings({
      ...settings,
      thresholds: wanted,
    }).thresholds
    const ok = (Object.keys(wanted) as (keyof typeof wanted)[]).every(
      (k) => wanted[k] === undefined || clean[k] === wanted[k],
    )
    if (!ok) {
      setNotice('err')
      return
    }
    const next = { ...settings, thresholds: clean }
    await dataStore.saveSettings(next)
    setSettings(next)
    setNotice('ok')
  }

  if (!settings) return null
  return (
    <section className="dt-card">
      <h2>{g.thTitle}</h2>
      <p>{g.thHint}</p>
      <form className="gm-form gm-th" onSubmit={(ev) => void save(ev)}>
        <label className="pl-fld">
          <span>{g.thMaxHr}</span>
          <input
            className="pl-inp"
            inputMode="numeric"
            value={maxHr}
            onChange={(e) => {
              setMaxHr(e.target.value)
              setNotice(null)
            }}
          />
        </label>
        <label className="pl-fld">
          <span>{g.thRestHr}</span>
          <input
            className="pl-inp"
            inputMode="numeric"
            value={restHr}
            onChange={(e) => {
              setRestHr(e.target.value)
              setNotice(null)
            }}
          />
        </label>
        <label className="pl-fld">
          <span>{g.thFtp}</span>
          <input
            className="pl-inp"
            inputMode="numeric"
            value={ftp}
            onChange={(e) => {
              setFtp(e.target.value)
              setNotice(null)
            }}
          />
        </label>
        {notice && (
          <p
            className={notice === 'err' ? 'gm-err' : 'gm-ok'}
            role={notice === 'err' ? 'alert' : 'status'}
          >
            {notice === 'err' ? g.thInvalid : g.thSaved}
          </p>
        )}
        <div className="dt-actions">
          <button type="submit" className="pl-btn acc">
            {g.thSave}
          </button>
        </div>
      </form>
    </section>
  )
}
