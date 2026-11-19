import { useI18n } from '../../i18n/context'
import { formatClock, parseClock } from '../../lib/enduranceTemplate'

interface Props {
  /** `null` = automatica, altrimenti il testo scritto a mano. */
  override: string | null
  /** Durata calcolata (`null` se non nota). */
  auto: number | null
  /** Prefisso "≥" quando la durata calcolata è parziale. */
  partial?: boolean
  onChange: (override: string | null) => void
}

/** Durata stimata: calcolata, sovrascrivibile a mano, "Ripristina automatico". */
export default function DurationField({
  override,
  auto,
  partial = false,
  onChange,
}: Props) {
  const { t } = useI18n()
  const p = t.planner
  const error =
    override !== null && override.trim() !== '' && parseClock(override) === null
      ? p.clockInvalid
      : null
  return (
    <div className="pl-fld">
      <span>{p.durationEst}</span>
      <div className="en-dur">
        <input
          className="pl-inp pl-short"
          inputMode="numeric"
          placeholder="—"
          value={override ?? (auto !== null ? formatClock(auto) : '')}
          aria-label={p.durationEst}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
        />
        {override !== null ? (
          <button
            type="button"
            className="pl-btn pl-small"
            onClick={() => onChange(null)}
          >
            {p.restoreAuto}
          </button>
        ) : null}
      </div>
      <small>
        {override !== null
          ? p.durationManual
          : auto !== null
            ? `${p.durationAuto}${partial ? ` (${p.partialShort})` : ''}`
            : p.durationNone}
      </small>
      {error && <em className="pl-err">{error}</em>}
    </div>
  )
}
