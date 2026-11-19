// Client minimo di intervals.icu (API pubblica, accesso con la chiave
// personale: Basic auth con utente `API_KEY`). Il sito accetta chiamate dal
// browser (CORS), quindi non serve un server.
import type { IntervalsLink } from '../../data/store'

const BASE = 'https://intervals.icu/api/v1'

export class IntervalsError extends Error {
  readonly kind: 'auth' | 'offline'
  constructor(kind: 'auth' | 'offline') {
    super(kind)
    this.kind = kind
  }
}

/** Un'attività dell'elenco (solo i campi usati). */
export interface IntervalsActivity {
  id: string
  type?: string
  start_date_local?: string
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
): Promise<IntervalsActivity[]> {
  const res = await get(
    link,
    `/athlete/${athlete(link)}/activities?oldest=${oldest}&newest=${newest}`,
  )
  const data: unknown = await res.json()
  if (!Array.isArray(data)) return []
  return data
    .filter(
      (a): a is IntervalsActivity =>
        !!a && typeof a === 'object' && typeof a.id === 'string',
    )
    .map((a) => ({
      id: a.id,
      type: typeof a.type === 'string' ? a.type : undefined,
      start_date_local:
        typeof a.start_date_local === 'string' ? a.start_date_local : undefined,
    }))
}

/** Sport che possono essere corsa, bici, nuoto o multisport (gli altri non si scaricano). */
export const isEnduranceType = (type?: string) =>
  !type || /run|ride|swim|triathlon|duathlon|multisport|transition/i.test(type)

/** File originale dell'attività (FIT, a volte compresso: lo apre `extractFitFiles`). */
export async function downloadFile(
  link: IntervalsLink,
  id: string,
): Promise<Uint8Array> {
  const res = await get(link, `/activity/${encodeURIComponent(id)}/file`)
  return new Uint8Array(await res.arrayBuffer())
}
