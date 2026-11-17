import { useI18n } from '../../i18n/context'
import { RPE_VALUES } from '../../lib/load'
import './rpe.css'

interface Props {
  value: number | null
  onChange: (rpe: number) => void
  /** Mostra l'avviso se manca (dopo un tentativo di salvataggio). */
  showError?: boolean
  /** Senza etichetta sopra (es. in una riga di elenco). */
  bare?: boolean
}

/** Scala RPE 1–10 a un tocco, con la legenda. */
export default function RpeScale({ value, onChange, showError, bare }: Props) {
  const { t } = useI18n()
  const r = t.rpe
  return (
    <div className="pl-fld">
      {!bare && <span>{r.label}</span>}
      <div
        className="rpe-scale"
        role="group"
        aria-label={r.label}
        aria-invalid={showError && value === null}
      >
        {RPE_VALUES.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <small>{r.legend}</small>
      {showError && value === null && <em className="pl-err">{r.required}</em>}
    </div>
  )
}
