# Supabase: attivare la sincronizzazione

Senza queste operazioni l'app funziona come prima, solo sul dispositivo. Servono una volta sola (circa 15 minuti).

## 1. Crea il progetto

1. Vai su [supabase.com](https://supabase.com), accedi e crea un progetto (**New project**), piano gratuito. Scegli una regione europea (es. Frankfurt) e annota la password del database (non serve all'app).
2. Aspetta che il progetto sia pronto.

## 2. Crea la tabella

1. **SQL Editor** → **New query**.
2. Incolla tutto il contenuto di [`supabase/schema.sql`](../supabase/schema.sql) e premi **Run**. Si può rieseguire senza perdere dati.

## 3. Login con codice via email

1. **Authentication** → **Sign In / Providers**: il provider **Email** deve essere attivo (lo è di default).
2. **Authentication** → **Emails** → modelli **Magic Link** e **Confirm signup** (il secondo arriva al primissimo accesso): aggiungi il codice nel testo dell'email, così puoi inserirlo nell'app (utile soprattutto dall'app installata sul telefono). Esempio:

   ```html
   <h2>Accedi a My Masterpiece</h2>
   <p>Il tuo codice: <strong>{{ .Token }}</strong></p>
   <p>
     Oppure <a href="{{ .ConfirmationURL }}">apri questo link</a> dal
     dispositivo su cui vuoi accedere.
   </p>
   ```

3. **Authentication** → **URL Configuration**: in **Site URL** metti l'indirizzo dove è pubblicata l'app; in **Redirect URLs** aggiungi anche `http://localhost:5173` per lo sviluppo.

Nota: il servizio email incluso nel piano gratuito invia poche email all'ora. Per un utente basta; con più utenti servirà un SMTP proprio (Authentication → Emails → SMTP Settings).

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

1. Apri l'app sul dispositivo con i dati veri → **Dati** → **Account e sincronizzazione** → inserisci l'email → **Inviami il codice** → inserisci il codice.
2. Prima del collegamento viene salvato un backup ("Prima del collegamento all'account"); poi i dati vengono inviati al server.
3. Sugli altri dispositivi accedi con la stessa email: un dispositivo appena installato prende i dati del server; uno già usato li unisce ai suoi.
