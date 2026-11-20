# Roadmap

Le versioni non hanno date: la **v1.1 è pronta quando tutti i bloccanti sono chiusi**. Dettagli di ogni punto (dove, cosa può succedere, soluzione) in [review-v1.1.md](review-v1.1.md).

## v1.1 — prima versione ufficiale

- ✅ **B1** Elenchi vecchi che sovrascrivono dati più nuovi (live, Collega, più schede, import Garmin): lettura-modifica-scrittura in una sola transazione.
- ⬜ **B2** Cambi di sola posizione che riscrivono intere sedute (sovrascrittura di modifiche fatte offline, traffico).
- ⬜ **B3** Avvio "solo in memoria" silenzioso ed errori di salvataggio nascosti: avviso, sincronizzazione e strumenti del server bloccati.
- ⬜ **B4** Migrazioni e sincronizzazione: migrazione senza nuove ore né cancellazioni, guardia per dati di una versione più recente.
- ⬜ **B5** Pulizia automatica delle cancellazioni dopo 90 giorni: da togliere.
- ⬜ **B6** Download dal server a pagine con offset: paginazione a chiave.
- ⬜ **B7** Iscrizioni aperte su Supabase: chiuse, con messaggio chiaro nell'app.
- ⬜ **B8** "Esporta tutto" nell'APK che non salva nulla: export dal PC.
- ⬜ **B9** Error Boundary: niente più schermo bianco.
- ⬜ Versione 1.1.0 nell'app (pagina Dati), `CHANGELOG.md`, `docs/release-checklist.md`, guida aggiornata.
- ⬜ Verifica finale su telefono e PC (checklist di release).

## v1.2 — miglioramenti

- ⬜ **Dati e sincronizzazione:** ora del dispositivo sbagliata (limite lato server); impostazioni in voci separate; confronto per riferimento nei salvataggi; backup più leggeri e limiti separati; cache FIT compressa o con limite; testi di Importa/Ripristina e ricaricamento delle pagine; Ricarica il server e riconciliazione completa dei dispositivi fermi; cambio di account; aggiornamento tra schede; validazione più profonda delle voci sincronizzate.
- ⬜ **Garmin:** errori per singola attività su intervals.icu; id deterministico delle sedute importate; giorno dall'ora locale dell'attività; FIT troncati; lettura del FIT in un Web Worker; timeout delle richieste.
- ⬜ **Allenamento live:** durata di un allenamento dimenticato aperto; valori "ultima volta" calcolati una volta; avviso per notifiche negate; tasto Indietro di Android con le finestre aperte.
- ⬜ **Export dal telefono** (file e condivisione di Android).
- ⬜ **Android e PWA:** aggiornamento della PWA con avviso; font nel progetto; caricamento delle pagine su richiesta; barre di sistema (bordo a bordo); `allowBackup`; workflow APK più sicuro (SHA fissati, keystore cancellato, lint e test prima della build); `.gitignore` dei keystore; `theme-color` del tema scuro.
- ⬜ **Sicurezza:** dipendenze di sviluppo con vulnerabilità moderate; CSP e header su Vercel.
- ⬜ **UI e codice:** testi di accesso per l'APK; esercizi di base in inglese; focus trap nelle modali; avviso "aggiorna l'app" visibile ovunque; modulo delle soglie che non si azzera; test di `account`, `supabaseRemote`, `fitStorage`, hook di salvataggio, FIT troncati e nuoto in vasca; prestazioni delle viste Mese e Anno.
- ⬜ **Rifinitura grafica** e **confronto con il periodo precedente** in Analisi.
