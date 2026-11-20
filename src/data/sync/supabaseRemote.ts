// Il server della sincronizzazione su Supabase: tabella `items` e funzione `push_items`
// (vedi `supabase/schema.sql`).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RemoteChange, SyncChange, SyncKind, SyncRemote } from './types'

/** Righe per pagina in lettura. */
const PAGE = 1000

interface ItemRow {
  kind: SyncKind
  id: string
  pos: number
  item: unknown
  deleted: boolean
  updated_at: string
  server_at: string
  schema_version: number
}

/** Le ore di Postgres ("2026-11-18 10:00:00.123+00") in ISO con i millisecondi. */
const iso = (v: string) => new Date(v).toISOString()

/** Chiave di una riga nell'ordine di lettura: ora del server (com'è, con i microsecondi), tipo, id. */
export interface PageKey {
  serverAt: string
  kind: string
  id: string
}

/** Valore per un filtro di PostgREST, tra virgolette (le ore contengono `:` `.` `+`). */
const quoted = (v: string) =>
  `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** Filtro "righe dopo `k`" nell'ordine (server_at, kind, id). */
export function afterKey(k: PageKey): string {
  const at = quoted(k.serverAt)
  const kind = quoted(k.kind)
  return [
    `server_at.gt.${at}`,
    `and(server_at.eq.${at},kind.gt.${kind})`,
    `and(server_at.eq.${at},kind.eq.${kind},id.gt.${quoted(k.id)})`,
  ].join(',')
}

/**
 * Legge tutte le pagine **a chiave**: ogni pagina parte dopo l'ultima riga
 * letta, non da una posizione. Così una riga modificata durante il download
 * (che si sposta in fondo) non fa saltare quelle che seguono.
 */
export async function readAllPages<
  R extends { server_at: string; kind: string; id: string },
>(
  fetchPage: (after: PageKey | null, size: number) => Promise<R[]>,
  size = PAGE,
): Promise<R[]> {
  const out: R[] = []
  let after: PageKey | null = null
  for (;;) {
    const rows = await fetchPage(after, size)
    out.push(...rows)
    if (rows.length < size) return out
    const last = rows[rows.length - 1]
    after = { serverAt: last.server_at, kind: last.kind, id: last.id }
  }
}

export function createSupabaseRemote(client: SupabaseClient): SyncRemote {
  return {
    async pull(since) {
      const rows = await readAllPages<ItemRow>(async (after, size) => {
        let query = client
          .from('items')
          .select(
            'kind, id, pos, item, deleted, updated_at, server_at, schema_version',
          )
          .order('server_at')
          .order('kind')
          .order('id')
          .limit(size)
        if (since) query = query.gt('server_at', since)
        if (after) query = query.or(afterKey(after))
        const { data, error } = await query
        if (error) throw error
        return (data ?? []) as ItemRow[]
      })
      return rows.map((r): RemoteChange => ({
        kind: r.kind,
        id: r.id,
        pos: r.pos,
        item: r.item,
        deleted: r.deleted,
        updatedAt: iso(r.updated_at),
        serverAt: iso(r.server_at),
        schemaVersion: r.schema_version,
      }))
    },

    async push(changes: SyncChange[]) {
      if (changes.length === 0) return
      const rows = changes.map((c) => ({
        kind: c.kind,
        id: c.id,
        pos: c.pos,
        item: c.deleted ? null : c.item,
        deleted: c.deleted,
        updated_at: c.updatedAt,
        schema_version: c.schemaVersion,
      }))
      const { error } = await client.rpc('push_items', { rows })
      if (error) throw error
    },
  }
}
