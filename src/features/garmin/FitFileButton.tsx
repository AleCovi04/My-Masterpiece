import { Capacitor } from '@capacitor/core'
import { useRef } from 'react'

/** Pulsante che apre la scelta dei file (`.fit`, `.zip`, `.gz`). */
export default function FitFileButton({
  label,
  busyLabel,
  busy,
  multiple,
  className = 'pl-btn',
  onFiles,
}: {
  label: string
  busyLabel: string
  busy: boolean
  multiple?: boolean
  className?: string
  onFiles: (files: File[]) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={() => ref.current?.click()}
      >
        {busy ? busyLabel : label}
      </button>
      <input
        ref={ref}
        type="file"
        hidden
        multiple={multiple}
        // su Android il filtro nasconderebbe i .fit (tipo sconosciuto)
        accept={Capacitor.isNativePlatform() ? undefined : '.fit,.zip,.gz'}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          onFiles(files)
        }}
      />
    </>
  )
}
