import { describe, expect, it } from 'vitest'
import { afterKey, readAllPages, type PageKey } from './supabaseRemote'

interface Row {
  server_at: string
  kind: string
  id: string
}

const cmp = (a: Row, b: Row) =>
  a.server_at.localeCompare(b.server_at) ||
  a.kind.localeCompare(b.kind) ||
  a.id.localeCompare(b.id)

const after = (r: Row, k: PageKey) =>
  cmp(r, { server_at: k.serverAt, kind: k.kind, id: k.id }) > 0

const at = (s: number) =>
  `2026-11-18T10:00:${String(s).padStart(2, '0')}.000001+00:00`

describe('download a pagine (B6)', () => {
  it('una riga modificata durante il download non fa saltare le altre', async () => {
    // 10 righe, pagine da 3
    const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({
      server_at: at(i),
      kind: 'sessions',
      id: `s${i}`,
    }))
    let pages = 0
    const read = await readAllPages<Row>(async (k, size) => {
      pages += 1
      if (pages === 2) {
        // un altro dispositivo modifica s0 (già letta): va in fondo
        rows[0] = { ...rows[0], server_at: at(59) }
      }
      return rows
        .filter((r) => !k || after(r, k))
        .sort(cmp)
        .slice(0, size)
    }, 3)
    const ids = new Set(read.map((r) => r.id))
    for (let i = 0; i < 10; i++) expect(ids.has(`s${i}`)).toBe(true)
  })

  it('righe con la stessa ora del server: si distinguono per tipo e id', async () => {
    const rows: Row[] = [
      { server_at: at(1), kind: 'exercises', id: 'b' },
      { server_at: at(1), kind: 'exercises', id: 'a' },
      { server_at: at(1), kind: 'sessions', id: 'a' },
      { server_at: at(1), kind: 'meta', id: 'settings' },
    ]
    const read = await readAllPages<Row>(
      async (k, size) =>
        rows
          .filter((r) => !k || after(r, k))
          .sort(cmp)
          .slice(0, size),
      1,
    )
    expect(read.map((r) => `${r.kind}/${r.id}`)).toEqual([
      'exercises/a',
      'exercises/b',
      'meta/settings',
      'sessions/a',
    ])
  })

  it('il filtro usa l’ora del server com’è, tra virgolette', () => {
    expect(
      afterKey({
        serverAt: '2026-11-18T10:00:00.123456+00:00',
        kind: 'sessions',
        id: 'a"b',
      }),
    ).toBe(
      'server_at.gt."2026-11-18T10:00:00.123456+00:00",' +
        'and(server_at.eq."2026-11-18T10:00:00.123456+00:00",kind.gt."sessions"),' +
        'and(server_at.eq."2026-11-18T10:00:00.123456+00:00",kind.eq."sessions",id.gt."a\\"b")',
    )
  })
})
