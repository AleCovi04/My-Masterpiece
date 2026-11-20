// Pila di ciò che il tasto Indietro di Android chiude prima di cambiare pagina:
// finestre, menu laterale, calendari a comparsa. Vince l'ultimo aperto.

const stack: { close: () => void }[] = []

/** Registra qualcosa di aperto; la funzione restituita lo toglie dalla pila. */
export function registerBackClose(close: () => void): () => void {
  const entry = { close }
  stack.push(entry)
  return () => {
    const i = stack.indexOf(entry)
    if (i >= 0) stack.splice(i, 1)
  }
}

/**
 * Tasto Indietro: chiude l'ultima cosa aperta. `true` = gestito (anche se la
 * finestra decide di restare aperta, per esempio durante un salvataggio).
 */
export function closeTopOnBack(): boolean {
  const top = stack[stack.length - 1]
  if (!top) return false
  top.close()
  return true
}
