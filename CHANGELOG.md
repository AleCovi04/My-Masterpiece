# Changelog

Versioni numerate, senza date di uscita fissate in anticipo: una versione esce quando i suoi bloccanti sono chiusi (vedi `docs/roadmap.md`). Come si pubblica: `docs/release-checklist.md`.

## 1.1.0 — prima versione ufficiale

Prima versione per l'uso quotidiano (telefono con l'app Android, PC con il browser), dopo la revisione pre-release (`docs/archivio/review-v1.1.md`). Schema dei dati: **10** (nessuna migrazione rispetto alle build precedenti).

### Funzioni

- **Panoramica, Calendario** (settimana, mese, anno) con giorni colorati per esito, sedute create dagli allenamenti, spostamento, duplicazione, salta/ripristina.
- **Forger**: esercizi, allenamenti di forza, endurance e brick, blocchi di settimane tipo e fasi; applicazione al calendario da un lunedì (in coda o sostituendo le sedute programmate).
- **Il Piano**: cronologia di fasi e blocchi, completamento per fase, blocco e settimana, traguardo gara.
- **Allenamento live della forza** a schermo intero: kg × ripetizioni con i valori dell'ultima volta, recupero con notifica a schermo spento (app Android), superserie, modifiche al volo, ripresa dopo la chiusura, riepilogo con record e RPE.
- **Eseguito endurance e brick** inserito a mano, con scostamento dal piano.
- **Analisi**: Volumi, Carico (RPE, rapporto acuto/cronico, Freschezza, Forma), Forza (mappa muscolare, record, grafici), con filtro del periodo.
- **Garmin**: import dei `.FIT`/`.zip`, finestra "Collega" e "Sincronizza Garmin" tramite intervals.icu, pagina Attività con mappa, grafici, parziali, zone e migliori prestazioni; file originali nello Storage di Supabase.
- **Dati**: IndexedDB con migrazioni e backup automatici, export/import JSON, account e sincronizzazione con Supabase tra telefono e PC, spazio sul server, Libera spazio, Ricarica il server, Ricomincia da zero.
- **App Android** (APK firmato dalle Release di GitHub) con avviso delle nuove build; PWA installabile dal sito.

### Correzioni della revisione pre-release

- **Nessuna perdita di dati con copie vecchie (B1):** ogni modifica si applica ai dati di adesso, in una sola transazione. Termina del live, "Collega" di Garmin durante l'allenamento, due schede aperte e import non cancellano né riportano indietro ciò che è arrivato nel frattempo.
- **Allenamenti registrati offline al sicuro (B2):** aggiungere o eliminare una seduta non riscrive più tutte le altre (che vincevano su un allenamento registrato senza rete sul telefono).
- **Salvataggio sempre visibile (B3):** se il database del dispositivo non si apre o un salvataggio fallisce, compare un avviso rosso fisso; in quel caso sincronizzazione e strumenti del server sono bloccati. Un backup automatico non riuscito non blocca più l'avvio. Ricarica il server e Ricomincia da zero segnalano l'errore se l'invio al server non riesce.
- **Migrazioni future e rollback (B4):** una migrazione non sovrascrive le modifiche degli altri dispositivi; dati salvati da una versione più recente aprono l'app in sola lettura con l'avviso "Aggiorna l'app".
- **Niente più pulizia automatica delle cancellazioni (B5)**, che poteva far ricomparire voci cancellate da un dispositivo rimasto spento a lungo.
- **Download dal server più sicuro (B6):** pagine a chiave invece che con l'offset.
- **Iscrizioni chiuse (B7):** si accede solo con un account esistente, con un messaggio chiaro per le email non registrate.
- **Export dall'app Android (B8):** al posto di un pulsante che non salvava nulla, la nota "fai l'export dal PC".
- **Niente più schermo bianco (B9):** un errore in una pagina mostra un messaggio con Ricarica e Vai a Dati.
- **Chiavi di firma escluse da git (B10).**
- **Tasto Indietro di Android (B11):** con una finestra aperta la chiude, senza cambiare pagina né uscire dall'app.
- **Barre di sistema (B12):** intestazione, barra del recupero, sidebar e finestre non finiscono sotto la barra di stato o di navigazione.

### Note per l'aggiornamento

- Nuova dipendenza: `@capacitor/app` (tasto Indietro dell'app Android). Serve il nuovo APK.
- Su Supabase: iscrizioni da chiudere e "Confirm email" da verificare (checklist di release). `supabase/schema.sql` è cambiato solo in un commento: non serve rieseguirlo.
- La versione è visibile in fondo alla pagina **Dati** ("Versione 1.1.0", con il numero di build nell'app Android).
