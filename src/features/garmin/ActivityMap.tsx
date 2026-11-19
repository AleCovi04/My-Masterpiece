import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { FitPoint } from '../../lib/fit/types'

interface Props {
  points: FitPoint[]
  /** Campione evidenziato (indice in `points` dell'attività intera). */
  hover: number | null
  /** Indice del primo campione di `points` nell'attività. */
  offset: number
  attribution: string
}

/** Colore di una variabile del tema, letto dall'elemento (la mappa disegna su canvas/SVG proprio). */
const cssVar = (el: Element, name: string, fallback: string) =>
  getComputedStyle(el).getPropertyValue(name).trim() || fallback

/** Mappa con la traccia (OpenStreetMap). Senza internet resta la traccia senza sfondo. */
export default function ActivityMap({
  points,
  hover,
  offset,
  attribution,
}: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.CircleMarker | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const track = points
      .filter((p) => p.lat !== undefined && p.lon !== undefined)
      .map((p) => [p.lat!, p.lon!] as [number, number])
    if (track.length < 2) return
    const color = cssVar(el, '--c', '#d50f25')
    const surface = cssVar(el, '--surface', '#ffffff')
    const m = L.map(el, {
      attributionControl: true,
      zoomControl: true,
      scrollWheelZoom: false,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution,
    }).addTo(m)
    const line = L.polyline(track, { color, weight: 4, opacity: 0.95 }).addTo(m)
    const dot = (at: [number, number], fill: string) =>
      L.circleMarker(at, {
        radius: 6,
        color: surface,
        weight: 2,
        fillColor: fill,
        fillOpacity: 1,
      }).addTo(m)
    dot(track[0], cssVar(el, '--ok', '#1d8c4a'))
    dot(track[track.length - 1], cssVar(el, '--miss', '#9e2a2f'))
    m.fitBounds(line.getBounds(), { padding: [16, 16] })
    marker.current = L.circleMarker(track[0], {
      radius: 7,
      color: surface,
      weight: 3,
      fillColor: cssVar(el, '--text', '#161112'),
      fillOpacity: 1,
      opacity: 0,
    }).addTo(m)
    marker.current.setStyle({ fillOpacity: 0 })
    map.current = m
    return () => {
      m.remove()
      map.current = null
      marker.current = null
    }
  }, [points, attribution])

  useEffect(() => {
    const mk = marker.current
    if (!mk) return
    const p = hover !== null ? points[hover - offset] : undefined
    if (p?.lat === undefined || p.lon === undefined) {
      mk.setStyle({ opacity: 0, fillOpacity: 0 })
      return
    }
    mk.setLatLng([p.lat, p.lon])
    mk.setStyle({ opacity: 1, fillOpacity: 1 })
  }, [hover, offset, points])

  return <div ref={box} className="am" />
}
