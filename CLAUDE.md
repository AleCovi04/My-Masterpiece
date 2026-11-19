# My Masterpiece

## All'inizio di ogni compito

Leggi `docs/roadmap.md` e `docs/decisioni.md`. Leggi `docs/modello-dati.md` se tocchi i dati.

## Stack

React 19 + TypeScript + Vite, ESLint + Prettier, Vitest, Dexie (IndexedDB).

## Struttura

- `docs/` roadmap, decisioni, modello dati, `guida.md` e `guida.tex` (stessa guida: uso dell'app e amministrazione dei servizi; aggiornarle insieme quando cambia un flusso o un servizio; `guida.tex` si compila con pdflatex, non latexmk: sul PC manca Perl), `spazio-dati.md` (procedura se lo spazio su Supabase si riempie), `archivio/`
- `src/app/` entry e cornice dell'app
- `src/features/` moduli per funzionalità (il Forger è in `forger/`, Il Piano in `plan/`); una feature può usare i componenti di un'altra
- `src/components/` UI riutilizzabile (`ui/` con `Modal`, `layout/`, `body/`)
- `src/hooks/` hook React generici (media query, larghezza dei grafici, trascinamento)
- `src/lib/` calcoli puri e helper (date, periodi, statistiche…)
- `src/data/` tipi, `dataStore`, migrazioni
- `src/i18n/` traduzioni IT/EN; `src/styles/` tema e stili condivisi (`ui.css`: campi, bottoni, liste, finestre)

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

## Ambiente e utilizzo

- **Uso:** sul telefono come app Android (APK, Capacitor) o PWA installata; da PC su Windows con VS Code. Istruzioni pensate per il telefono o per il browser normale; il browser interno di VS Code è un "dispositivo" a parte (dati e login suoi): non usarlo per provare login e dati.
- **Sito:** https://my-masterpiece.vercel.app, deploy automatico su Vercel a ogni push su `main`. `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` sono in Vercel (tipo Config) e in `.env.local` (fuori da git); una variabile cambiata vale solo dopo un nuovo deploy. Per verificare il deploy: scaricare il bundle pubblicato e cercarci l'URL di Supabase.
- **Dati:** sincronizzati con Supabase (piano gratuito). Login via email: link (da aprire nello stesso browser) o codice da digitare (unico modo nell'app Android); SMTP con Resend, mittente `onboarding@resend.dev`, che senza dominio verificato invia solo all'email dell'account Resend (va bene finché l'utente è uno). Site URL e Redirect URLs: il sito Vercel e `http://localhost:5173`.
- **Schema del server:** `supabase/schema.sql`, da rieseguire nel SQL Editor di Supabase dopo ogni modifica; i progetti nuovi non concedono permessi in automatico (servono i `grant` espliciti).
- **Anti-pausa:** workflow `supabase-keepalive` su GitHub Actions, con i segreti del repository `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`. Repository `AleCovi04/My-Masterpiece` (pubblico). `gh` è installato e collegato all'account (in Bash non è nel PATH: usare PowerShell o `"$env:ProgramFiles\GitHub CLI\gh.exe"`): log dei workflow, avvio dei run, release.
- **App Android:** APK costruito dal workflow `Android APK` (GitHub Actions, avvio a mano o tag `v*`) e scaricato dalle Release; chiave di firma in `Documenti\MyMasterpiece-chiave-android\` e nei segreti `ANDROID_KEYSTORE_BASE64` / `ANDROID_KEYSTORE_PASSWORD`. Guida in `docs/guida.md` (§14). Java e Android SDK non sono installati sul PC: niente build Android in locale.
- **Garmin:** import dei `.FIT`/`.zip` e "Sincronizza Garmin" tramite intervals.icu (ID atleta e chiave API solo sul dispositivo); file FIT originali nel bucket privato `fit` dello Storage di Supabase (creato da `supabase/schema.sql`). Guida in `docs/guida.md` (§5, §16).
- **Istruzioni all'utente:** passo passo, con il percorso esatto dei menu (Supabase, Vercel, GitHub) o link diretti, una cosa alla volta.
