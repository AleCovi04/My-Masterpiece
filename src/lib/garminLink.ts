// Finestra "Collega": abbinamento delle attività di intervals.icu alle sedute
// prima di scaricarle (funzioni pure). Vedi docs/modello-dati.md ("Import Garmin").
import type {
  EnduranceDiscipline,
  Id,
  ImportRecord,
  IsoDate,
  Session,
} from '../data/types'

/** Un'attività dell'elenco di intervals.icu (solo i campi usati). */
export interface RemoteActivity {
  id: string
  type?: string
  name?: string
  /** Inizio in ora locale, "YYYY-MM-DDTHH:mm:ss". */
  startLocal?: string
  /** Inizio in UTC (ISO). */
  startUtc?: string
  distanceM?: number
  movingS?: number
}

/** Disciplina dal tipo di intervals.icu (`Run`, `VirtualRide`, `OpenWaterSwim`…). */
export function remoteDiscipline(type?: string): EnduranceDiscipline | null {
  if (!type) return null
  if (/swim/i.test(type)) return 'swim'
  if (/run/i.test(type)) return 'run'
  if (/ride|cycl|bike/i.test(type)) return 'bike'
  return null
}

/**
 * Sedute a cui si può collegare un'attività di una disciplina in un giorno:
 * stessa disciplina, non saltate e non già importate da Garmin (anche se
 * svolte a mano), nell'ordine del giorno.
 */
export function linkCandidates(
  sessions: Session[],
  date: IsoDate,
  discipline: EnduranceDiscipline,
): Session[] {
  return sessions
    .filter(
      (s) =>
        s.date === date &&
        s.discipline === discipline &&
        s.status !== 'skipped' &&
        s.actual?.source !== 'garmin_fit',
    )
    .sort((a, b) => a.order - b.order)
}

/** Id del record di un'attività di intervals.icu da non collegare mai. */
export const ignoredImportId = (intervalsId: string) => `icu-${intervalsId}`

/** Tolleranza sull'ora d'inizio per riconoscere un'attività già importata da file. */
const SAME_START_MS = 2 * 60_000

/** L'attività è già nell'app (importata o ignorata)? */
function known(a: RemoteActivity, imports: ImportRecord[]): boolean {
  const start = a.startUtc ? Date.parse(a.startUtc) : NaN
  return imports.some(
    (r) =>
      r.intervalsId === a.id ||
      (!Number.isNaN(start) &&
        Math.abs(Date.parse(r.startedAt) - start) < SAME_START_MS),
  )
}

export interface LinkProposal {
  activity: RemoteActivity
  date: IsoDate
  discipline: EnduranceDiscipline
  /** Sedute adatte (vuoto = nessuna seduta programmata). */
  candidates: Session[]
  /** Seduta proposta: la prima adatta non già proposta per un'altra attività. */
  target: Id | null
}

/**
 * Attività di corsa, bici e nuoto non ancora nell'app, dalla più vecchia, con
 * la seduta proposta per ciascuna.
 */
export function proposeLinks(
  activities: RemoteActivity[],
  sessions: Session[],
  imports: ImportRecord[],
): LinkProposal[] {
  const used = new Set<Id>()
  return activities
    .filter((a) => a.startLocal && !known(a, imports))
    .sort((a, b) => a.startLocal!.localeCompare(b.startLocal!))
    .flatMap((a): LinkProposal[] => {
      const discipline = remoteDiscipline(a.type)
      if (!discipline) return []
      const date = a.startLocal!.slice(0, 10)
      const candidates = linkCandidates(sessions, date, discipline)
      const pick = candidates.find((s) => !used.has(s.id))
      if (pick) used.add(pick.id)
      return [
        { activity: a, date, discipline, candidates, target: pick?.id ?? null },
      ]
    })
}
