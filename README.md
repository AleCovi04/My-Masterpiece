# My Masterpiece

App per preparare un triathlon (Ironman 70.3): libreria di allenamenti (Forger), periodizzazione in fasi e blocchi (Il Piano), calendario, registrazione della forza dal vivo e dell'endurance, import da Garmin, analisi di volumi, carico e forza. Funziona offline e si sincronizza tra dispositivi.

- **Sito:** https://my-masterpiece.vercel.app (PWA)
- **App Android:** APK nelle [Release](https://github.com/AleCovi04/My-Masterpiece/releases/latest)
- **Guida all'uso e all'amministrazione:** [docs/guida.md](docs/guida.md)

## Stack

React 19 + TypeScript + Vite · Dexie (IndexedDB) · Supabase (login e sincronizzazione) · Capacitor (Android) · Vitest · ESLint + Prettier.

## Sviluppo

```bash
npm install
cp .env.example .env.local   # URL e chiave publishable di Supabase (facoltativo)
npm run dev                  # http://localhost:5173
```

| Comando                | Cosa fa                    |
| ---------------------- | -------------------------- |
| `npm run dev`          | server di sviluppo         |
| `npm run build`        | controllo dei tipi e build |
| `npm run lint`         | ESLint                     |
| `npm test`             | test (Vitest)              |
| `npm run format`       | formatta con Prettier      |
| `npm run format:check` | controlla la formattazione |

## Struttura

```
src/
  app/         cornice dell'app: rotte, intestazione, menu, tema
  features/    una cartella per sezione: overview, calendar, plan, forger,
               live, endurance, garmin, analysis, data
  components/  UI riutilizzabile (ui/, layout/, body/ = mappa muscolare)
  hooks/       hook React generici
  lib/         calcoli puri (date, carico, record, FIT…), con i test
  data/        tipi, dataStore (unico accesso ai dati), migrazioni, sync/
  i18n/        testi in italiano e inglese
  styles/      tema (colori) e stili condivisi
docs/          guida, roadmap, decisioni, modello dati
supabase/      schema del server
android/       progetto Capacitor
```

Documenti per chi sviluppa: [roadmap](docs/roadmap.md) · [decisioni](docs/decisioni.md) · [modello dati](docs/modello-dati.md).

Licenze di terze parti: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
