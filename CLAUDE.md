# My Masterpiece

## All'inizio di ogni compito

Leggi `docs/roadmap.md` e `docs/decisioni.md`. Leggi `docs/modello-dati.md` se tocchi i dati.

## Stack

React 19 + TypeScript + Vite, ESLint + Prettier, Vitest, Dexie (IndexedDB).

## Struttura

- `docs/` roadmap, decisioni, modello dati
- `src/app/` entry e cornice dell'app
- `src/features/` moduli per funzionalità
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

## Risposte

Brevi, al massimo 4 righe, più eventuali domande aperte o dubbi.

## Comandi

`npm run dev` · `npm run build` · `npm run lint` · `npm test` · `npm run format` · `npm run format:check`
