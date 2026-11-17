# Roadmap — versione 1

Obiettivo: app completa entro **gennaio 2027**, uso reale da **febbraio 2027**, per circa 2 anni (preparazione Ironman 70.3, agosto 2028). **Nessuna versione intermedia**: si rilascia solo la versione 1 completa.

- ✅ **Fondamenta** — Panoramica, Calendario (settimana/mese/anno), Planner (esercizi e allenamenti), sessioni del calendario create dai template, storage robusto (IndexedDB, migrazioni versionate, pagina Dati con export/import/backup).
- ✅ **Registrazione live della forza** — schermata a schermo intero dal dettaglio della sessione: kg × reps per serie con i valori in grigio dell'ultima volta, timer di recupero (anche superserie), modifiche al volo, ripresa dopo la chiusura, riepilogo con record.
- ⬜ **Registrazione endurance e brick** — ✅ brick (più frazioni endurance di fila con transizioni) nel Planner e nel Calendario; ⬜ inserimento manuale dell'eseguito (anche per frazione sui brick) dal dettaglio della seduta.
- ⬜ **Blocchi e Fasi nel Planner** — periodizzazione (settimane/mesi di allenamenti) applicabile al calendario in un colpo.
- ⬜ **Analisi** — carico di allenamento, progressione della forza, mappa muscolare heatmap, volumi endurance.
- ⬜ **Supabase** — login, sincronizzazione tra dispositivi, funzionamento offline-first.
- ⬜ **Capacitor** — app Android, timer di recupero con notifica.
- ⬜ **Rifinitura** — revisione finale, test su telefono reale, rifinitura grafica.
- ⬜ **Import Garmin e sincronizzazione** (ultimo punto) — import dei file `.FIT` dal dettaglio della seduta (anche multisport sui brick) e "Sincronizza" per portare nell'app tutte le attività Garmin che mancano; il metodo (file, cartella dell'orologio, intervals.icu o API Garmin) si decide allora.
