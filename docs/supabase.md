# Supabase: attivare la sincronizzazione

Senza queste operazioni l'app funziona come prima, solo sul dispositivo. Servono una volta sola (circa 15 minuti).

## 1. Crea il progetto

1. Vai su [supabase.com](https://supabase.com), accedi e crea un progetto (**New project**), piano gratuito. Scegli una regione europea (es. Frankfurt) e annota la password del database (non serve all'app).
2. Aspetta che il progetto sia pronto.

## 2. Crea la tabella

1. **SQL Editor** → **New query**.
2. Incolla tutto il contenuto di [`supabase/schema.sql`](../supabase/schema.sql) e premi **Run**. Si può rieseguire senza perdere dati.

## 3. Login con link via email

1. **Authentication** → **Sign In / Providers**: il provider **Email** deve essere attivo (lo è di default).
2. **Authentication** → **URL Configuration**: in **Site URL** metti l'indirizzo dell'app (per ora `http://localhost:5173`); in **Redirect URLs** aggiungi anche l'indirizzo dove sarà pubblicata.

L'email contiene un link: va aperto **nello stesso browser** da cui lo hai chiesto (il browser interno di VS Code e Chrome sono due "dispositivi" diversi). Nel piano gratuito i modelli delle email si modificano solo con un SMTP proprio (Authentication → Emails → Set up SMTP, es. Resend): servirà per avere anche il codice da digitare (app Android) e per inviare più di poche email all'ora.

## 4. Chiavi nell'app

1. **Project Settings** → **API Keys**: copia la **Publishable key** (`sb_publishable_…`; va bene anche la vecchia chiave `anon`). In **Project Settings** → **Data API** copia il **Project URL**.
2. Nella cartella del progetto copia `.env.example` in `.env.local` e inserisci i due valori. `.env.local` non va su git.
3. Dove pubblichi l'app (hosting), aggiungi le stesse due variabili d'ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` e ripubblica.

La chiave publishable è pubblica per natura (finisce nell'app): i dati sono protetti dalla Row Level Security, ognuno vede solo i propri. **Non** usare mai la chiave `secret`/`service_role` nell'app.

## 5. Anti-pausa (GitHub Actions)

Il piano gratuito mette in pausa il progetto dopo 7 giorni senza attività. Il workflow [`.github/workflows/supabase-keepalive.yml`](../.github/workflows/supabase-keepalive.yml) fa una lettura ogni 3 giorni.

1. Su GitHub: repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**: `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` (gli stessi valori del punto 4).
2. **Actions** → **Supabase keep-alive** → **Run workflow** per provarlo: deve finire in verde.

Se il progetto va comunque in pausa: ricevi un'email, l'app mostra "Sincronizzazione non riuscita" e continua a funzionare offline. Dalla dashboard di Supabase premi **Restore project**: dopo qualche minuto la sincronizzazione riparte da sola.

## 6. Primo accesso

1. Apri l'app sul dispositivo con i dati veri → **Dati** → **Account e sincronizzazione** → inserisci l'email → **Inviami il link** → apri il link dell'email nello stesso browser.
2. Prima del collegamento viene salvato un backup ("Prima del collegamento all'account"); poi i dati vengono inviati al server.
3. Sugli altri dispositivi accedi con la stessa email: un dispositivo appena installato prende i dati del server; uno già usato li unisce ai suoi.
