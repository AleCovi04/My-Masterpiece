export interface TipRow {
  key: string
  label: string
  value: string
  /** Colore della serie (variabile del tema). */
  color?: string
  /** Riga del pianificato: puntino al posto del quadratino. */
  planned?: boolean
  strong?: boolean
}

interface Props {
  /** Ascissa della colonna o del punto scelto. */
  x: number
  /** Larghezza del grafico. */
  width: number
  top: number
  title: string
  rows: TipRow[]
}

/** Riquadro di dettaglio accanto alla colonna scelta (a destra, o a sinistra nella seconda metà). */
export default function ChartTip({ x, width, top, title, rows }: Props) {
  const right = x < width / 2
  return (
    <div
      className="ana-tip"
      role="status"
      style={
        right
          ? { left: Math.min(x + 14, width - 150), top }
          : { right: Math.min(width - x + 14, width - 150), top }
      }
    >
      <b>{title}</b>
      {rows.map((r) => (
        <span key={r.key} className={r.strong ? 'strong' : undefined}>
          {r.planned ? (
            <i className="dot" />
          ) : r.color ? (
            <i style={{ background: r.color }} />
          ) : (
            <i className="none" />
          )}
          {r.label}
          <em>{r.value}</em>
        </span>
      ))}
    </div>
  )
}
