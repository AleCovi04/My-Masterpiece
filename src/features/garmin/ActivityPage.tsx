import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DisciplineIcon } from '../../components/ui/Icons'
import { account, dataStore, useDataRevision } from '../../data'
import type {
  BrickSession,
  EnduranceDiscipline,
  EnduranceMetrics,
  EnduranceSession,
  Session,
  Thresholds,
} from '../../data/types'
import { useI18n } from '../../i18n/context'
import { readFit } from '../../lib/fit/decode'
import type { FitActivity } from '../../lib/fit/types'
import { fullDateLabel } from '../../lib/period'
import '../calendar/calendar.css'
import '../forger/planner.css'
import './garmin.css'
import { Stats } from './ActivityStats'
import { LegDetail } from './LegDetail'

type Fit =
  | { status: 'loading' }
  | { status: 'ok'; act: FitActivity }
  | { status: 'missing' }
  | { status: 'error' }

type Endurance = EnduranceSession | BrickSession

const isEndurance = (s: Session): s is Endurance => s.discipline !== 'strength'

/** Pagina di un'attività importata da Garmin: mappa, metriche, grafici, parziali, zone. */
export default function ActivityPage() {
  const { id } = useParams()
  const { t, lang } = useI18n()
  const g = t.garmin
  const navigate = useNavigate()
  const revision = useDataRevision()
  const [session, setSession] = useState<Endurance | null | undefined>()
  const [thresholds, setThresholds] = useState<Thresholds>({})
  // esito per attività: un'altra attività (o nessun esito) = in caricamento
  const [loaded, setLoaded] = useState<{ id: string; fit: Fit } | null>(null)
  const [leg, setLeg] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([dataStore.loadSessions(), dataStore.loadSettings()]).then(
      ([sessions, settings]) => {
        if (cancelled) return
        const s = sessions.find((x) => x.id === id)
        setSession(s && isEndurance(s) ? s : null)
        setThresholds(settings.thresholds)
      },
    )
    return () => {
      cancelled = true
    }
  }, [id, revision])

  const activityId = session?.actual?.garmin?.activityId
  useEffect(() => {
    if (!activityId) return
    let cancelled = false
    account
      .getFitFile(activityId)
      .then(async (bytes) => {
        if (!bytes) return { status: 'missing' } as const
        const act = await readFit(bytes)
        return act
          ? ({ status: 'ok', act } as const)
          : ({ status: 'error' } as const)
      })
      .catch(() => ({ status: 'error' }) as const)
      .then((next) => {
        if (!cancelled) setLoaded({ id: activityId, fit: next })
      })
    return () => {
      cancelled = true
    }
  }, [activityId])

  const fit: Fit =
    loaded && loaded.id === activityId ? loaded.fit : { status: 'loading' }

  if (session === undefined) return null
  const back = (
    <button type="button" className="pl-btn" onClick={() => navigate(-1)}>
      ‹ {g.back}
    </button>
  )
  if (!session || !session.actual) {
    return (
      <div className="gm-page">
        {back}
        <p className="ph">{g.notFound}</p>
      </div>
    )
  }

  const a = session.actual
  const act = fit.status === 'ok' ? fit.act : null
  const legs: { discipline: EnduranceDiscipline; metrics: EnduranceMetrics }[] =
    a.discipline === 'brick'
      ? a.legs.map((l) => ({ discipline: l.discipline, metrics: l }))
      : [{ discipline: a.discipline, metrics: a }]
  const legIndex = Math.min(leg, legs.length - 1)
  const fs = act?.sessions[legIndex]
  const d = legs[legIndex].discipline
  const startedAt = a.garmin?.startedAt
  const time = startedAt
    ? new Date(startedAt).toLocaleTimeString(
        lang === 'it' ? 'it-IT' : 'en-GB',
        {
          hour: '2-digit',
          minute: '2-digit',
        },
      )
    : ''
  const sub = fs?.subSport
    ? (g.subSport as Record<string, string>)[fs.subSport]
    : undefined

  return (
    <div className="gm-page" data-discipline={d}>
      {back}
      <header className="gm-head">
        <span className="wk-ic">
          <DisciplineIcon discipline={session.discipline} />
        </span>
        <div>
          <h1>{session.name ?? t.discipline[session.discipline]}</h1>
          <p>
            {fullDateLabel(session.date, t)}
            {time && ` · ${time}`}
            {sub && ` · ${sub}`}
          </p>
        </div>
      </header>

      {legs.length > 1 && (
        <div className="seg gm-legs" role="group" aria-label={g.leg}>
          {legs.map((l, i) => (
            <button
              type="button"
              key={i}
              aria-pressed={i === legIndex}
              onClick={() => setLeg(i)}
            >
              {i + 1} · {t.discipline[l.discipline]}
            </button>
          ))}
        </div>
      )}

      {fit.status === 'loading' && <p className="gm-hint">{g.loading}</p>}
      {fit.status === 'missing' && <p className="gm-note">{g.noFile}</p>}
      {fit.status === 'error' && <p className="gm-note">{g.readError}</p>}

      {act && fs ? (
        <LegDetail key={legIndex} act={act} s={fs} thresholds={thresholds} />
      ) : (
        <Stats d={d} m={legs[legIndex].metrics} />
      )}

      {(a.rpe !== undefined || a.notes) && (
        <section className="gm-sec">
          <dl className="gm-stats">
            {a.rpe !== undefined && (
              <div>
                <dt>{g.rpe}</dt>
                <dd>{a.rpe}/10</dd>
              </div>
            )}
            {a.notes && (
              <div className="gm-wide">
                <dt>{g.notes}</dt>
                <dd>{a.notes}</dd>
              </div>
            )}
          </dl>
        </section>
      )}
    </div>
  )
}
