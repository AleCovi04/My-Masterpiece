// Aggiornamento dell'app Android: confronto tra la build installata e l'ultima
// release su GitHub (tag `apk-N`, oppure "build N" nel nome per i tag `v*`).

/** Repository con le release dell'APK. */
export const RELEASES_API =
  'https://api.github.com/repos/AleCovi04/My-Masterpiece/releases/latest'
export const APK_ASSET = 'my-masterpiece.apk'
/** "Più tardi" ripropone l'avviso dopo questo tempo. */
export const SNOOZE_MS = 24 * 60 * 60 * 1000

export interface LatestRelease {
  build: number
  /** Link diretto all'APK (o alla pagina della release, se l'APK manca). */
  url: string
}

interface GithubRelease {
  tag_name?: unknown
  name?: unknown
  html_url?: unknown
  assets?: unknown
}

/** Numero di build di una release di GitHub; `null` se non si riconosce. */
export function releaseBuild(r: GithubRelease): number | null {
  const fromName =
    typeof r.name === 'string' ? /build[\s-]?(\d+)/i.exec(r.name) : null
  const fromTag =
    typeof r.tag_name === 'string' ? /^apk-(\d+)$/.exec(r.tag_name) : null
  const m = fromName ?? fromTag
  return m ? Number(m[1]) : null
}

/** Dalla risposta dell'API di GitHub alla release da proporre; `null` se non valida. */
export function parseRelease(json: unknown): LatestRelease | null {
  if (!json || typeof json !== 'object') return null
  const r = json as GithubRelease
  const build = releaseBuild(r)
  if (build === null) return null
  const assets = Array.isArray(r.assets) ? r.assets : []
  const apk = assets.find(
    (a): a is { browser_download_url: string } =>
      !!a &&
      typeof a === 'object' &&
      (a as { name?: unknown }).name === APK_ASSET &&
      typeof (a as { browser_download_url?: unknown }).browser_download_url ===
        'string',
  )
  const url = apk?.browser_download_url ?? r.html_url
  return typeof url === 'string' ? { build, url } : null
}

/** Va mostrato l'avviso? Solo se la release è più nuova e non è stato rimandato di recente. */
export function shouldOfferUpdate(
  installed: number,
  latest: LatestRelease | null,
  snoozedUntil: number | null,
  now: number,
): boolean {
  if (!latest || !Number.isFinite(installed) || installed <= 0) return false
  if (latest.build <= installed) return false
  return snoozedUntil === null || now >= snoozedUntil
}
