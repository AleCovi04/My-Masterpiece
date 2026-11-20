# Checklist di release

Passi da seguire, in ordine, per pubblicare una versione (la prima: **1.1.0**). Per ogni passo: dove cliccare e come capire che è andato bene. Le correzioni sono sul branch `release-1.1`: finché non lo unisci a `main` il sito e l'app non cambiano.

Tempo: circa un'ora, più 10 minuti di attesa per l'APK.

## A. Prima di tutto: una copia dei dati

1. **Export dal PC.** Nel browser normale (non quello di VS Code) apri https://my-masterpiece.vercel.app → **Dati** → **Esporta tutto (JSON)**. Salva il file su Drive.
   - ✅ Va bene se: c'è un file `my-masterpiece-AAAA-MM-GG.json` di qualche centinaio di KB (o più) e in **Dati** "Ultimo export manuale" è di oggi.
2. **Copia della chiave di firma Android.** Controlla che `Documenti\MyMasterpiece-chiave-android\` esista e copiala anche su Drive.
   - ✅ Va bene se: la cartella c'è in due posti. Senza la chiave non potrai più aggiornare l'app sopra quella installata.

## B. Provare il branch prima del merge

Le prove usano i tuoi dati veri (stesso account): per questo l'export viene prima.

1. **Sito di prova.** Vercel → progetto → **Deployments** → la riga con il branch `release-1.1` (Preview) → **Visit**.
   - Se in **Dati** compare "Sincronizzazione non configurata": Vercel → **Settings** → **Environment Variables** → apri `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` → spunta anche **Preview** → **Save** → Deployments → il deploy di `release-1.1` → ⋯ → **Redeploy**.
   - Sul sito di prova accedi con il **codice** dell'email (il link porta al sito principale).
   - ✅ Va bene se: in fondo a **Dati** c'è "Versione 1.1.0 · Versione dello schema dei dati: 10" e la sincronizzazione è verde.
2. **Prove sul sito di prova** (cosa provare: vedi il riepilogo della modifica). Al termine esci dall'account sul sito di prova (**Dati** → **Esci**).
3. **APK di prova (facoltativo).** GitHub → [Actions → Android APK](https://github.com/AleCovi04/My-Masterpiece/actions/workflows/android-apk.yml) → **Run workflow** → in "Use workflow from" scegli **Branch: release-1.1** → **Run workflow**. Crea una release di prova "My Masterpiece build-N": dopo il release vero puoi cancellarla (Releases → la release → 🗑).
   - ✅ Va bene se: il run diventa verde e la release ha il file `my-masterpiece.apk`.

## C. Supabase

1. **Chiudere le iscrizioni.** Supabase → progetto → **Authentication** → **Sign In / Providers** → sezione **User Signups** → disattiva **Allow new users to sign up** → **Save changes**.
2. **Confermare le email.** Nella stessa pagina: **Confirm email** deve essere attivo (se non lo è, attivalo → **Save changes**).
   - ✅ Va bene se: in una finestra anonima del sito → **Dati** → scrivi un'email diversa dalla tua → **Inviami il link** → compare "Questa email non ha un account: le iscrizioni sono chiuse". Con la tua email il codice arriva come sempre.
3. **Schema del server.** Questa versione ha cambiato `supabase/schema.sql` solo in un commento: non serve rieseguirlo. Se non l'hai rieseguito dopo le modifiche di "Ricomincia da zero" e "Libera spazio", fallo ora: Supabase → **SQL Editor** → **New query** → incolla tutto il file → **Run**.
   - ✅ Va bene se: in basso compare "Success. No rows returned".

## D. Servizi

1. **Vercel.** **Settings** → **Environment Variables**: ci sono `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (almeno per **Production**).
2. **Segreti GitHub.** [Settings → Secrets → Actions](https://github.com/AleCovi04/My-Masterpiece/settings/secrets/actions): ci sono `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`.
3. **Anti-pausa.** [Actions → Supabase keep-alive](https://github.com/AleCovi04/My-Masterpiece/actions/workflows/supabase-keepalive.yml): le ultime esecuzioni sono verdi (se c'è **Enable workflow**, premilo).
   - ✅ Va bene se: tutto presente e verde.

## E. Merge e sito

1. GitHub → [Pull requests](https://github.com/AleCovi04/My-Masterpiece/pulls) → **New pull request** → base: **main**, compare: **release-1.1** → **Create pull request** → **Merge pull request** → **Confirm merge**.
2. Vercel pubblica `main` da solo: **Deployments** → il deploy di produzione più recente diventa **Ready** (2–3 minuti).
   - ✅ Va bene se: su https://my-masterpiece.vercel.app (ricarica la pagina un paio di volte) in fondo a **Dati** c'è "Versione 1.1.0".

## F. Tag e APK

1. Nel terminale di VS Code, nella cartella del progetto:

   ```
   git checkout main
   git pull
   git tag -a v1.1.0 -m "My Masterpiece 1.1.0"
   git push origin v1.1.0
   ```

2. Il tag avvia da solo il workflow: [Actions → Android APK](https://github.com/AleCovi04/My-Masterpiece/actions/workflows/android-apk.yml) → il run di `v1.1.0` (5–10 minuti).
   - ✅ Va bene se: il run è verde e in [Releases](https://github.com/AleCovi04/My-Masterpiece/releases) c'è **My Masterpiece v1.1.0 (build N)** con `my-masterpiece.apk`, segnata come Latest.
   - Non rinominare mai il workflow "Android APK": il numero di build ripartirebbe da 1 e Android rifiuterebbe l'aggiornamento.
3. **Installazione.** Dal telefono: [Releases → ultima](https://github.com/AleCovi04/My-Masterpiece/releases/latest) → scarica `my-masterpiece.apk` → apri il file → **Installa** (sopra la vecchia: i dati restano).
   - ✅ Va bene se: in fondo a **Dati** c'è "Versione 1.1.0 (build N)" con lo stesso N della release.

## G. Verifiche finali

1. **Sincronizzazione:** su telefono e PC l'icona in alto è verde; crea una seduta sul PC → compare sul telefono entro pochi secondi (o con **Sincronizza ora**); cancellala dal telefono → sparisce sul PC.
2. **Allenamento di prova sul telefono:** avvia una seduta di forza → registra una serie → blocca lo schermo → la notifica di fine recupero arriva. Apri **Termina** e premi il tasto **Indietro**: la finestra si chiude e resti nell'allenamento. Poi **Annulla allenamento**.
3. **Garmin:** con un'attività nuova su intervals.icu compare la finestra **Collega** (o **Calendario → Sincronizza Garmin**).
4. **Schermo:** sul telefono intestazione, barra del recupero e finestre non finiscono sotto la barra di stato o quella di navigazione; sul PC (finestra larga) sidebar e pagine come prima.
5. **Export:** nell'app Android, in **Dati**, al posto del pulsante di export c'è la nota "fai l'export dal PC".

## H. Facoltativo: ripartire da zero

Per iniziare l'uso reale con dati puliti (decisione del 2026-11-19): **dopo l'export** (passo A1), su un dispositivo **Dati** → **Ricomincia da zero** → scrivi **AZZERA**. Gli altri dispositivi si svuotano da soli alla sincronizzazione. Dettagli: [spazio-dati.md](spazio-dati.md#ricominciare-da-zero).

## Se qualcosa va storto

- **Sito:** Vercel → **Deployments** → l'ultimo deploy funzionante → ⋯ → **Promote to Production**. Lo schema dei dati non è cambiato (10), quindi tornare a una versione precedente non crea problemi ai dati.
- **APK:** Android non permette di installare una build più vecchia sopra una più nuova. Si corregge e si pubblica una build nuova (passo F con un tag nuovo, es. `v1.1.1`, oppure **Run workflow** su `main`).
- **Dati:** ogni dispositivo ha i suoi backup (**Dati** → elenco dei backup → **Ripristina**); in ultima istanza **Dati** → **Importa** l'export del passo A1.
- **Avviso rosso in alto** ("Salvataggio non disponibile" o "Salvataggio non riuscito"): non usare gli strumenti del server; chiudi e riapri l'app e controlla lo spazio libero del dispositivo. Vedi la guida, §17.
