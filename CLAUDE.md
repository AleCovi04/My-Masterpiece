# My Masterpiece

## Stack

React 19 + TypeScript + Vite, ESLint + Prettier.

## Struttura

- `docs/` documentazione (`modello-dati.md`: regole del modello dati)
- `src/app/` entry dell'app (`App.tsx`)
- `src/features/` moduli per funzionalità
- `src/components/ui/` componenti UI riutilizzabili
- `src/lib/` utilità e helper
- `src/data/` tipi (`types.ts`), salvataggio IndexedDB dietro `dataStore` (unico accesso ai dati) e migrazioni versionate (`migrations.ts`)
- `src/i18n/` traduzioni
- `src/styles/` stili globali

## Convenzioni

- Componenti in PascalCase (`MyComponent.tsx`)
- Commit in italiano, piccoli e frequenti
- Ogni schermata si progetta mobile-first e poi si adatta al desktop (≥ 1024 px) con sidebar e PageContainer (`src/components/layout/`). Ogni modifica va verificata a entrambe le larghezze.

## Comandi

- `npm run dev` avvio sviluppo
- `npm run build` build di produzione
- `npm run lint` ESLint
- `npm test` test (Vitest)
- `npm run format` Prettier (scrive)
- `npm run format:check` Prettier (solo verifica)
