# My Masterpiece

## All'inizio di ogni compito

Leggi `docs/roadmap.md` e `docs/decisioni.md`. Leggi `docs/modello-dati.md` se tocchi i dati.

## Stack

React 19 + TypeScript + Vite, ESLint + Prettier, Vitest, Dexie (IndexedDB).

## Struttura

- `docs/` roadmap, decisioni, modello dati
- `src/app/` entry e cornice dell'app
- `src/features/` moduli per funzionalità (il Forger è in `planner/`, Il Piano in `plan/`)
- `src/components/` UI riutilizzabile (`ui/`, `layout/`, `body/`)
- `src/lib/` calcoli puri e helper
- `src/data/` tipi, `dataStore`, migrazioni
- `src/i18n/` traduzioni IT/EN; `src/styles/` stili e tema

## Regole

- Dati solo tramite `dataStore`; ogni cambio di schema = migrazione + test.
- Tutti i testi in IT/EN tramite i18n.
- Colori solo dalle variabili del tema.
- Mobile-first, poi desktop ≥ 1024 px (sidebar + PageContainer).
- Nessun dato personale nel codice (data gara, nome…): tutto configurabile, l'app diventerà multi-utente.
- Niente nuove dipendenze senza motivo; se aggiunte, dichiararle nella risposta.
- Mai azioni distruttive su dati, git o processi senza chiedere.
- Componenti in PascalCase; commit in italiano, piccoli e frequenti.

## Definizione di "fatto"

`npm run lint`, `npm test` e `npm run build` passano; verifica a 390 px e 1440 px; documentazione aggiornata (modello dati, decisioni, roadmap); commit con messaggio chiaro e push.

## Modo di lavorare

- Rispondi in italiano, in modo conciso.
- Per ogni nuovo punto della roadmap: prima 5–7 domande su flusso e scelte, ognuna con la tua proposta; poi un piano breve. Implementa solo dopo l'approvazione.
- Con più opzioni: pro e contro di ciascuna e quale consigli.
- Un compito alla volta; alla fine commit e push e riepilogo di 3–4 righe, con dubbi e domande aperte separati.
- Dopo ogni compito: cosa deve controllare l'utente (al massimo 5 punti, anche dal telefono).
- Aggiorna sempre roadmap, decisioni e modello dati.

## Risposte

Brevi, al massimo 4 righe, più eventuali domande aperte o dubbi.

## Comandi

`npm run dev` · `npm run build` · `npm run lint` · `npm test` · `npm run format` · `npm run format:check`
