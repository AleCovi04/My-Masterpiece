// Client minimo di intervals.icu (API pubblica, accesso con la chiave
// personale: Basic auth con utente `API_KEY`). Il sito accetta chiamate dal
// browser (CORS), quindi non serve un server.
import type { IntervalsLink } from '../../data/store'
import type { RemoteActivity } from '../../lib/garminLink'

const BASE = 'https://intervals.icu/api/v1'

export class IntervalsError extends Error {
  readonly kind: 'auth' | 'offline'
  constructor(kind: 'auth' | 'offline') {
    super(kind)
    this.kind = kind
  }
}

const headers = (link: Pick<IntervalsLink, 'apiKey'>) => ({
  Authorization: `Basic ${btoa(`API_KEY:${link.apiKey.trim()}`)}`,
})

async function get(
  link: Pick<IntervalsLink, 'athleteId' | 'apiKey'>,
  path: string,
): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { headers: headers(link) })
  } catch {
    throw new IntervalsError('offline')
  }
  if (res.status === 401 || res.status === 403 || res.status === 404)
    throw new IntervalsError('auth')
  if (!res.ok) throw new IntervalsError('offline')
  return res
}

const athlete = (link: Pick<IntervalsLink, 'athleteId'>) =>
  encodeURIComponent(link.athleteId.trim())

/** Controlla ID e chiave. */
export async function checkLink(
  link: Pick<IntervalsLink, 'athleteId' | 'apiKey'>,
): Promise<void> {
  await get(link, `/athlete/${athlete(link)}`)
}

/** Attività tra due giorni (compresi, "YYYY-MM-DD"). */
export async function listActivities(
  link: IntervalsLink,
  oldest: string,
  newest: string,
): Promise<RemoteActivity[]> {
  const res = await get(
    link,
    `/athlete/${athlete(link)}/activities?oldest=${oldest}&newest=${newest}`,
  )
  const data: unknown = await res.json()
  if (!Array.isArray(data)) return []
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
  const num = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined
  return data
    .filter(
      (a): a is Record<string, unknown> =>
        !!a && typeof a === 'object' && typeof a.id === 'string',
    )
    .map((a) => ({
      id: a.id as string,
      type: str(a.type),
      name: str(a.name),
      startLocal: str(a.start_date_local),
      startUtc: str(a.start_date),
      distanceM: num(a.distance),
      movingS: num(a.moving_time),
    }))
}

/** File originale dell'attività (FIT, a volte compresso: lo apre `extractFitFiles`). */
export async function downloadFile(
  link: IntervalsLink,
  id: string,
): Promise<Uint8Array> {
  const res = await get(link, `/activity/${encodeURIComponent(id)}/file`)
  return new Uint8Array(await res.arrayBuffer())
}
