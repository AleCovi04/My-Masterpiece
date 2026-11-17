# Roadmap — versione 1

Obiettivo: app completa entro **gennaio 2027**, uso reale da **febbraio 2027**, per circa 2 anni (preparazione Ironman 70.3, agosto 2028). **Nessuna versione intermedia**: si rilascia solo la versione 1 completa.

- ✅ **Fondamenta** — Panoramica, Calendario (settimana/mese/anno), Planner (esercizi e allenamenti), sessioni del calendario create dai template, giorni di Mese e Anno colorati per esito (svolto, parziale, saltato), storage robusto (IndexedDB, migrazioni versionate, pagina Dati con export/import/backup).
- ✅ **Registrazione live della forza** — schermata a schermo intero dal dettaglio della sessione: kg × reps per serie con i valori in grigio dell'ultima volta, timer di recupero (anche superserie), modifiche al volo, ripresa dopo la chiusura, riepilogo con record.
- ✅ **Registrazione endurance e brick** — brick (più frazioni endurance di fila con transizioni) nel Planner e nel Calendario; inserimento manuale dell'eseguito dal dettaglio della seduta (anche per frazione sui brick), con scostamento dal piano.
- ✅ **Blocchi e Fasi nel Forger** — blocchi di settimane tipo (1–12, editor a griglia), fasi come sequenze di blocchi, applicazione al calendario da un lunedì (in coda o sostituendo le programmate) con etichette nella settimana e rimozione.
- ✅ **Forger e Il Piano** — il Planner diventa Forger (solo libreria: esercizi, allenamenti, blocchi, fasi); nuova sezione Il Piano con la cronologia di fasi e blocchi in calendario, completamento per fase, blocco e settimana, traguardo gara.
- ✅ **Analisi** — sezione Analisi con filtro periodo (scelte rapide 4 sett., 12 sett., 6 mesi, Anno, Tutto, Piano, Personalizzato; frecce per spostarsi; fase o blocco dalla cronologia del Piano; scelta ricordata sul dispositivo) e tre schede: Volumi (ore per disciplina e distanza, eseguito contro pianificato), Carico (sRPE, Forma/Fatica, RPE nel riepilogo della forza), Forza (mappa muscolare con le serie pesate e gli esercizi per muscolo, progressione per esercizio con 1RM stimato, kg massimi e volume).
- ⬜ **Supabase** — login, sincronizzazione tra dispositivi, funzionamento offline-first.
- ⬜ **Capacitor** — app Android, timer di recupero con notifica.
- ⬜ **Rifinitura** — revisione finale, test su telefono reale, rifinitura grafica.
- ⬜ **Import Garmin e sincronizzazione** (ultimo punto) — import dei file `.FIT` dal dettaglio della seduta (anche multisport sui brick) e "Sincronizza" per portare nell'app tutte le attività Garmin che mancano; il metodo (file, cartella dell'orologio, intervals.icu o API Garmin) si decide allora.
