import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from 'react'

export const LONG_PRESS_MS = 400
const TOUCH_TOLERANCE_PX = 8
const MOUSE_THRESHOLD_PX = 4
const EDGE_PX = 64

export interface Drag {
  from: number
  /** Posizione di arrivo nella lista senza l'elemento trascinato. */
  to: number
  /** Posizione verticale della linea guida, in px dall'alto della lista. */
  line: number
}

interface CoreOptions<K, T> {
  /** Contenitore scorrevole più vicino: `.pl-box`. */
  listRef: RefObject<HTMLElement | null>
  /** Dove cadrebbe l'elemento `key` con il puntatore in (x, y). */
  locate: (key: K, x: number, y: number) => T | null
  onDrop: (key: K, target: T) => void
}

interface Press<K> {
  key: K
  x: number
  y: number
  lastX: number
  lastY: number
  pointerType: string
  timer?: number
  lifted: boolean
}

/**
 * Trascinamento con pressione prolungata: mouse = trascini subito dalla
 * maniglia, tocco = tieni premuto ~400 ms. Scorre da solo ai bordi.
 * La geometria (dove cade l'elemento) la decide `locate`.
 */
export function useDragSort<K, T>({
  listRef,
  locate,
  onDrop,
}: CoreOptions<K, T>) {
  const [drag, setDrag] = useState<{ key: K; target: T } | null>(null)
  const press = useRef<Press<K> | null>(null)
  const raf = useRef(0)
  const dropRef = useRef(onDrop)
  const locateRef = useRef(locate)
  useEffect(() => {
    dropRef.current = onDrop
    locateRef.current = locate
  })

  const stop = useCallback(() => {
    const p = press.current
    if (p) window.clearTimeout(p.timer)
    window.cancelAnimationFrame(raf.current)
    press.current = null
    setDrag(null)
  }, [])

  useEffect(() => stop, [stop])

  // ciclo di scorrimento automatico ai bordi del contenitore scorrevole
  const loopRef = useRef<() => void>(() => {})
  useEffect(() => {
    loopRef.current = () => {
      const p = press.current
      const list = listRef.current
      if (!p || !p.lifted || !list) return
      const scroller = list.closest<HTMLElement>('.pl-box')
      if (scroller) {
        const r = scroller.getBoundingClientRect()
        if (p.lastY < r.top + EDGE_PX) scroller.scrollTop -= 14
        else if (p.lastY > r.bottom - EDGE_PX) scroller.scrollTop += 14
      }
      const target = locateRef.current(p.key, p.lastX, p.lastY)
      setDrag(target ? { key: p.key, target } : null)
      raf.current = window.requestAnimationFrame(() => loopRef.current())
    }
  }, [listRef])

  const lift = useCallback(() => {
    const p = press.current
    if (!p) return
    p.lifted = true
    navigator.vibrate?.(15)
    raf.current = window.requestAnimationFrame(() => loopRef.current())
  }, [])

  const handleProps = (key: K) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      press.current = {
        key,
        x: e.clientX,
        y: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        pointerType: e.pointerType,
        lifted: false,
        timer:
          e.pointerType === 'mouse'
            ? undefined
            : window.setTimeout(lift, LONG_PRESS_MS),
      }
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const p = press.current
      if (!p) return
      p.lastX = e.clientX
      p.lastY = e.clientY
      if (p.lifted) return
      const dist = Math.hypot(e.clientX - p.x, e.clientY - p.y)
      if (p.pointerType === 'mouse') {
        if (dist > MOUSE_THRESHOLD_PX) lift()
      } else if (dist > TOUCH_TOLERANCE_PX) {
        // si è mosso prima dei 400 ms: non è un tocco prolungato
        window.clearTimeout(p.timer)
        press.current = null
      }
    },
    onPointerUp: () => {
      const p = press.current
      if (p?.lifted) {
        const target = locateRef.current(p.key, p.lastX, p.lastY)
        if (target) dropRef.current(p.key, target)
      }
      stop()
    },
    onPointerCancel: stop,
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  })

  return { drag, handleProps }
}

interface Options {
  /** Contenitore con figli diretti `[data-block="<indice>"]`. */
  listRef: RefObject<HTMLElement | null>
  onMove: (from: number, to: number) => void
}

/** Riordino di blocchi in una lista piatta (editor di forza). */
export function useSortable({ listRef, onMove }: Options) {
  const locate = useCallback(
    (from: number, _x: number, y: number): Omit<Drag, 'from'> | null => {
      const list = listRef.current
      if (!list) return null
      const blocks = Array.from(
        list.querySelectorAll<HTMLElement>(':scope > [data-block]'),
      ).filter((b) => Number(b.dataset.block) !== from)
      const top = list.getBoundingClientRect().top
      let to = blocks.length
      for (let i = 0; i < blocks.length; i++) {
        const r = blocks[i].getBoundingClientRect()
        if (y < r.top + r.height / 2) {
          to = i
          break
        }
      }
      let line: number
      if (blocks.length === 0) line = 0
      else if (to === 0) line = blocks[0].getBoundingClientRect().top - top - 6
      else if (to === blocks.length)
        line = blocks[to - 1].getBoundingClientRect().bottom - top + 6
      else
        line =
          (blocks[to - 1].getBoundingClientRect().bottom +
            blocks[to].getBoundingClientRect().top) /
            2 -
          top
      return { to, line }
    },
    [listRef],
  )
  const { drag, handleProps } = useDragSort<number, Omit<Drag, 'from'>>({
    listRef,
    locate,
    onDrop: (from, t) => onMove(from, t.to),
  })
  return {
    drag: drag ? ({ from: drag.key, ...drag.target } as Drag) : null,
    handleProps,
  }
}
