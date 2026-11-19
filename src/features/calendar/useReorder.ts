import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type RefObject,
} from 'react'
import type { Id, IsoDate } from '../../data/types'

const LONG_PRESS_MS = 400
const MOVE_TOLERANCE_PX = 8

interface DropIndicator {
  date: IsoDate
  index: number
  /** Posizione verticale della linea, in px dall'alto della lista. */
  line: number
}

/** Posizione di inserimento in una lista di card, in base alla Y del puntatore. */
function dropPosition(list: HTMLElement, y: number, draggedId: Id) {
  const cards = Array.from(
    list.querySelectorAll<HTMLElement>('[data-sid]'),
  ).filter((c) => c.dataset.sid !== draggedId)
  const top = list.getBoundingClientRect().top
  let index = cards.length
  for (let i = 0; i < cards.length; i++) {
    const r = cards[i].getBoundingClientRect()
    if (y < r.top + r.height / 2) {
      index = i
      break
    }
  }
  let line: number
  if (cards.length === 0) {
    line = list.getBoundingClientRect().height / 2
  } else if (index === 0) {
    line = cards[0].getBoundingClientRect().top - top - 5
  } else if (index === cards.length) {
    line = cards[cards.length - 1].getBoundingClientRect().bottom - top + 5
  } else {
    line =
      (cards[index - 1].getBoundingClientRect().bottom +
        cards[index].getBoundingClientRect().top) /
        2 -
      top
  }
  return { index, line }
}

interface Options {
  /** Elemento che contiene i giorni (con `[data-day]`, `[data-list]`, `[data-sid]`). */
  containerRef: RefObject<HTMLElement | null>
  /** Solo la card di questo giorno si può sollevare col tocco prolungato. */
  selectedDay: IsoDate | null
  /** Drag & drop con mouse attivo (PC). */
  mouseDrag: boolean
  onMove: (id: Id, date: IsoDate, index: number) => void
}

interface Press {
  id: Id
  date: IsoDate
  list: HTMLElement
  x: number
  y: number
  timer: number
  lifted: boolean
  index: number | null
}

/**
 * Riordino delle card: drag & drop nativo su PC (anche fra giorni diversi),
 * pressione prolungata su telefono (solo nel giorno selezionato e solo dentro
 * quel giorno).
 */
export function useReorder({
  containerRef,
  selectedDay,
  mouseDrag,
  onMove,
}: Options) {
  const [draggingId, setDraggingId] = useState<Id | null>(null)
  const [liftedId, setLiftedId] = useState<Id | null>(null)
  const [indicator, setIndicator] = useState<DropIndicator | null>(null)
  const dragId = useRef<Id | null>(null)
  const suppressClick = useRef(false)
  const selectedRef = useRef(selectedDay)
  const onMoveRef = useRef(onMove)

  useEffect(() => {
    selectedRef.current = selectedDay
    onMoveRef.current = onMove
  })

  const showIndicator = useCallback(
    (date: IsoDate, index: number, line: number) =>
      setIndicator((p) =>
        p && p.date === date && p.index === index && p.line === line
          ? p
          : { date, index, line },
      ),
    [],
  )

  // ---------- PC: drag & drop nativo ----------
  const clearDrag = useCallback(() => {
    dragId.current = null
    setDraggingId(null)
    setIndicator(null)
  }, [])

  const cardProps = useCallback(
    (id: Id) =>
      mouseDrag
        ? {
            draggable: true,
            onDragStart: (e: DragEvent) => {
              dragId.current = id
              e.dataTransfer.setData('text/plain', id)
              e.dataTransfer.effectAllowed = 'move'
              // dopo il frame, così l'immagine trascinata non è sbiadita
              window.setTimeout(() => {
                if (dragId.current === id) setDraggingId(id)
              }, 0)
            },
            onDragEnd: clearDrag,
          }
        : {},
    [mouseDrag, clearDrag],
  )

  const dayProps = useCallback(
    (date: IsoDate) => ({
      onDragOver: (e: DragEvent<HTMLElement>) => {
        const id = dragId.current
        if (!id) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        const list = e.currentTarget.querySelector<HTMLElement>('[data-list]')
        if (!list) return
        const p = dropPosition(list, e.clientY, id)
        showIndicator(date, p.index, p.line)
      },
      onDrop: (e: DragEvent<HTMLElement>) => {
        const id = dragId.current
        if (!id) return
        e.preventDefault()
        const list = e.currentTarget.querySelector<HTMLElement>('[data-list]')
        const index = list ? dropPosition(list, e.clientY, id).index : 0
        clearDrag()
        onMoveRef.current(id, date, index)
      },
    }),
    [clearDrag, showIndicator],
  )

  /** Da mettere sul contenitore: toglie la linea quando il drag esce dai giorni. */
  const onContainerDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIndicator(null)
    }
  }, [])

  // ---------- Telefono: pressione prolungata ----------
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let press: Press | null = null

    const reset = () => {
      if (press) window.clearTimeout(press.timer)
      press = null
      setLiftedId(null)
      setIndicator(null)
    }

    const update = (p: Press, y: number) => {
      const pos = dropPosition(p.list, y, p.id)
      p.index = pos.index
      showIndicator(p.date, pos.index, pos.line)
    }

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return reset()
      const target = e.target as Element | null
      const card = target?.closest<HTMLElement>('[data-sid]')
      const day = card?.closest<HTMLElement>('[data-day]')
      const list = day?.querySelector<HTMLElement>('[data-list]')
      if (!card || !day || !list) return
      if (day.dataset.day !== selectedRef.current) return
      reset()
      const touch = e.touches[0]
      const p: Press = {
        id: card.dataset.sid as Id,
        date: day.dataset.day as IsoDate,
        list,
        x: touch.clientX,
        y: touch.clientY,
        lifted: false,
        index: null,
        timer: window.setTimeout(() => {
          p.lifted = true
          setLiftedId(p.id)
          try {
            navigator.vibrate?.(15)
          } catch {
            // vibrazione non disponibile
          }
          update(p, p.y)
        }, LONG_PRESS_MS),
      }
      press = p
    }

    const onMoveTouch = (e: TouchEvent) => {
      if (!press) return
      const touch = e.touches[0]
      if (!press.lifted) {
        // movimento prima dei 400 ms = scorrimento della pagina, non riordino
        if (
          Math.abs(touch.clientX - press.x) > MOVE_TOLERANCE_PX ||
          Math.abs(touch.clientY - press.y) > MOVE_TOLERANCE_PX
        ) {
          reset()
        }
        return
      }
      if (e.cancelable) e.preventDefault()
      press.y = touch.clientY
      update(press, touch.clientY)
    }

    const onEnd = () => {
      if (!press) return
      const p = press
      if (p.lifted) {
        suppressClick.current = true
        window.setTimeout(() => (suppressClick.current = false), 400)
      }
      reset()
      if (p.lifted && p.index !== null) onMoveRef.current(p.id, p.date, p.index)
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMoveTouch, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', reset)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMoveTouch)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', reset)
      if (press) window.clearTimeout(press.timer)
    }
  }, [containerRef, showIndicator])

  return {
    draggingId,
    liftedId,
    indicator,
    cardProps,
    dayProps,
    onContainerDragLeave,
    /** Dopo un riordino col tocco il "click" finale non deve (de)selezionare il giorno. */
    shouldSuppressClick: () => suppressClick.current,
  }
}
