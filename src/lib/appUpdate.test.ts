import { describe, expect, it } from 'vitest'
import {
  parseRelease,
  releaseBuild,
  shouldOfferUpdate,
  SNOOZE_MS,
} from './appUpdate'

const apk = {
  name: 'my-masterpiece.apk',
  browser_download_url: 'https://example.com/my-masterpiece.apk',
}

describe('aggiornamento dell’APK', () => {
  it('legge il numero di build dal nome o dal tag', () => {
    expect(
      releaseBuild({ tag_name: 'apk-7', name: 'My Masterpiece build-7' }),
    ).toBe(7)
    expect(
      releaseBuild({
        tag_name: 'v1.0.0',
        name: 'My Masterpiece v1.0.0 (build 12)',
      }),
    ).toBe(12)
    expect(releaseBuild({ tag_name: 'apk-3' })).toBe(3)
    expect(releaseBuild({ tag_name: 'v1.0.0', name: 'v1.0.0' })).toBeNull()
  })

  it('preferisce il link diretto all’APK', () => {
    expect(
      parseRelease({
        tag_name: 'apk-4',
        html_url: 'https://example.com/r',
        assets: [apk],
      }),
    ).toEqual({ build: 4, url: apk.browser_download_url })
    expect(
      parseRelease({
        tag_name: 'apk-4',
        html_url: 'https://example.com/r',
        assets: [],
      }),
    ).toEqual({ build: 4, url: 'https://example.com/r' })
    expect(parseRelease(null)).toBeNull()
    expect(parseRelease({ message: 'API rate limit exceeded' })).toBeNull()
  })

  it('propone solo versioni più nuove e rispetta il "più tardi"', () => {
    const latest = { build: 5, url: 'u' }
    const now = 1_000_000_000_000
    expect(shouldOfferUpdate(4, latest, null, now)).toBe(true)
    expect(shouldOfferUpdate(5, latest, null, now)).toBe(false)
    expect(shouldOfferUpdate(6, latest, null, now)).toBe(false)
    expect(shouldOfferUpdate(4, null, null, now)).toBe(false)
    // build sconosciuta (sviluppo locale): niente avviso
    expect(shouldOfferUpdate(NaN, latest, null, now)).toBe(false)
    // rimandato: niente avviso per 24 ore
    expect(shouldOfferUpdate(4, latest, now + SNOOZE_MS, now)).toBe(false)
    expect(shouldOfferUpdate(4, latest, now + SNOOZE_MS, now + SNOOZE_MS)).toBe(
      true,
    )
  })
})
