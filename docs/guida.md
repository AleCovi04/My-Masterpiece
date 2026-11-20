# Guida di My Masterpiece

Due parti: **Usare l'app** (per chi si allena) e **Amministrare** (per chi gestisce i servizi dietro l'app). Nessuna chiave o password è scritta qui: la guida dice solo dove trovarle.

**Parte 1 – Usare l'app**

1. [Installare](#1-installare)
2. [Accedere e sincronizzare](#2-accedere-e-sincronizzare)
3. [Il percorso: Forger → Il Piano → Calendario](#3-il-percorso-forger--il-piano--calendario)
4. [Allenarsi e registrare](#4-allenarsi-e-registrare)
5. [Garmin](#5-garmin)
6. [Analisi](#6-analisi)
7. [Backup ed export](#7-backup-ed-export)
8. [A cosa stare attento](#8-a-cosa-stare-attento)

**Parte 2 – Amministrare**

9. [Mappa dei servizi](#9-mappa-dei-servizi)
10. [Chiavi: cosa è pubblico e cosa no](#10-chiavi-cosa-è-pubblico-e-cosa-no)
11. [Supabase](#11-supabase)
12. [Vercel (il sito)](#12-vercel-il-sito)
13. [GitHub](#13-github)
14. [App Android (APK)](#14-app-android-apk)
15. [Resend (email del login)](#15-resend-email-del-login)
16. [intervals.icu e Garmin](#16-intervalsicu-e-garmin)
17. [Se qualcosa si rompe](#17-se-qualcosa-si-rompe)
18. [Manutenzione: cosa fare e quando](#18-manutenzione-cosa-fare-e-quando)
19. [Partire da zero (nuovo progetto)](#19-partire-da-zero-nuovo-progetto)

---

# Parte 1 – Usare l'app

## 1. Installare

L'app è la stessa ovunque; cambia solo come la apri.

| Dove                 | Come                                                                                                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Telefono Android** | App (APK): dal telefono apri l'ultima release su GitHub ([Releases → ultima](https://github.com/AleCovi04/My-Masterpiece/releases/latest)), scarica `my-masterpiece.apk`, aprilo, consenti l'installazione → **Installa**. |
| **Telefono, PWA**    | In Chrome apri [my-masterpiece.vercel.app](https://my-masterpiece.vercel.app) → menu ⋮ → **Aggiungi a schermata Home** / **Installa app**.                                                                                 |
| **PC**               | Apri il sito nel browser (Chrome o Edge); facoltativo: icona "Installa" nella barra degli indirizzi.                                                                                                                       |

Consiglio: sul telefono usa l'**APK** (notifica di fine recupero anche a schermo spento). La PWA va bene come riserva.

**Aggiornare l'APK:** l'app non si installa gli aggiornamenti da sola, ma te lo dice: quando su GitHub c'è una versione nuova, all'apertura compare **Nuova versione disponibile**. **Aggiorna** scarica l'APK nel browser: al termine tocca il file → **Installa** (sopra il vecchio, i dati restano). **Più tardi** la ripropone dopo 24 ore. Serve internet; l'avviso c'è dalle versioni costruite dopo il 19/11/2026. Il sito e la PWA invece si aggiornano da soli alla riapertura.

**Che versione ho?** In fondo alla pagina **Dati**: per esempio "Versione 1.1.0 (build 42)" nell'app Android, "Versione 1.1.0" nel sito. Le novità di ogni versione sono in [`CHANGELOG.md`](../CHANGELOG.md).

## 2. Accedere e sincronizzare

L'app funziona anche **senza account**, ma i dati restano solo su quel dispositivo. Con l'account si sincronizzano tra telefono e PC.

1. **Dati** → **Account e sincronizzazione** → scrivi la tua email → **Inviami il link** (l'email contiene anche il codice).
2. Arriva un'email con un **codice** e un **link**:
   - **app Android:** digita il **codice** (il link aprirebbe il browser, non l'app);
   - **browser:** codice oppure link, ma il link va aperto **nello stesso browser** da cui l'hai chiesto.
3. La prima volta l'app salva un backup ("Prima del collegamento all'account") e poi unisce i dati con quelli del server.

Le **iscrizioni sono chiuse**: si accede solo con un account già creato. Con un'email senza account l'app risponde "Questa email non ha un account" (controlla di averla scritta giusta).

L'icona nell'intestazione mostra lo stato: sincronizzato, in corso, offline, errore. Senza rete l'app funziona lo stesso e manda le modifiche appena torna online. Se due dispositivi modificano la stessa voce, **vince la modifica più recente**.

**Uscire** dall'account non cancella i dati dal dispositivo.

## 3. Il percorso: Forger → Il Piano → Calendario

- **Forger** – la libreria: esercizi, allenamenti (forza, corsa/bici/nuoto, brick), **blocchi** (1–12 settimane tipo) e **fasi** (sequenze di blocchi). Qui si crea, non si mette niente in calendario.
- **Il Piano** – mette fasi e blocchi in calendario da un lunedì (in coda alle sedute o sostituendo le programmate). Mostra la cronologia, il completamento per fase, blocco e settimana e il traguardo della gara. Da qui si può anche **rimuovere** un'applicazione (solo le sedute ancora programmate).
- **Calendario** – viste Settimana, Mese e Anno. Il **+** aggiunge una seduta (da un allenamento o vuota); tenendo premuta una seduta la sposti. I colori nei giorni passati: verde tutte svolte, arancione in parte, rosso nessuna.
- **Panoramica** – la settimana in corso, il carico e i giorni alla gara. Nel riquadro rosso tocca **Obiettivo** per scrivere il tuo (es. "70.3": l'app mostra "Road to 70.3" anche sotto il logo) e **Data gara** per scegliere la data. Valgono su tutti i dispositivi. Sotto c'è la **citazione del giorno**: cambia a mezzanotte ed è la stessa su telefono e PC.

## 4. Allenarsi e registrare

**Forza (live):** apri la seduta → **Inizia allenamento**. Per ogni serie inserisci kg × ripetizioni (in grigio i valori dell'ultima volta); il timer di recupero parte da solo e alla fine suona e vibra. Se chiudi l'app, alla riapertura riprendi da dove eri. Alla fine: **RPE** (1–10, obbligatorio), note e riepilogo con i record.

**Corsa, bici, nuoto, brick:** il telefono non registra l'allenamento, lo fa l'orologio. Dopo:

- con Garmin collegato i dati arrivano da soli (vedi sotto), poi aggiungi l'**RPE**;
- oppure a mano: apri la seduta → **Registra eseguito** (tempo obbligatorio, distanza, FC, dislivello, RPE, note; sui brick per frazione).

**Allenamento non previsto:** Calendario → **+** → seduta vuota → **Registra eseguito** (o lascia che Garmin la crei).

## 5. Garmin

Tre modi, dal più comodo:

1. **Finestra "Collega"** (con intervals.icu collegato, vedi [§16](#16-intervalsicu-e-garmin)): all'apertura l'app propone le attività degli ultimi 14 giorni che cadono nello stesso giorno e sport di una seduta programmata. Lascia la spunta su quelle giuste → **Collega**. **Più tardi** la ripropone, **✕** non la propone più.
2. **Calendario → Sincronizza Garmin**: le attività degli ultimi 30 giorni senza seduta (per esempio una corsa in un giorno di riposo); spunta quelle da aggiungere.
3. **File a mano**: su Garmin Connect (sito) apri l'attività → ⚙ → **Esporta originale** (`.zip`). Nell'app: dettaglio della seduta → **Importa .FIT**, oppure **Dati** → **Importa file Garmin** (anche più file insieme).

Le sedute importate hanno la pagina **Attività**: mappa, grafici, parziali, giri, vasche, zone e migliori prestazioni. Solo corsa, bici, nuoto e multisport (sui brick); la forza dell'orologio viene ignorata. Un'attività già importata non torna, nemmeno se cancelli la seduta.

**Zone:** **Dati** → **Soglie per le zone** (FC massima, FC a riposo, FTP). Senza, l'app usa le zone dell'orologio.

## 6. Analisi

Filtro del periodo in alto (ultime N settimane/mesi/anni, Tutto, Piano, Personalizzato; le frecce spostano il periodo), poi tre schede:

- **Volumi** – ore per disciplina e distanze, svolto contro pianificato.
- **Carico** – basato sull'RPE: barra del rapporto acuto/cronico con una frase che dice se stai progredendo in sicurezza, Freschezza a parole, andamento della Forma. **Senza RPE il carico non si calcola**: aggiungilo sempre.
- **Forza** – mappa dei muscoli (Recupero o Volume), ultimi record, record e grafici per esercizio.

I filtri a chip: un tocco accende o spegne, **tenendo premuto** isoli quel chip.

## 7. Backup ed export

- **Backup automatici** sul dispositivo: uno alla settimana e prima delle operazioni rischiose (import, ripristino, primo collegamento). Se ne tengono gli ultimi 8. **Dati** → elenco dei backup → **Ripristina**.
- **Export**: **dal PC**, nel browser: **Dati** → **Esporta tutto (JSON)** scarica un file `.json` con tutti i dati. Fallo ogni mese e salvalo su Drive: è l'unica copia che non dipende da Supabase. Nell'app Android il file non si può salvare: al posto del pulsante c'è la nota "fai l'export dal PC".
- **Import**: **Dati** → **Importa** un file esportato (prima l'app salva un backup).
- **Ricomincia da zero**: **Dati** → in fondo, riquadro rosso. Cancella tutto (sedute, attività e file Garmin, Forger, data gara, obiettivo, impostazioni) qui e, con l'account, sul server; gli altri dispositivi si svuotano da soli alla sincronizzazione. Restano account, intervals.icu e un backup. Conferma scrivendo **AZZERA**.

## 8. A cosa stare attento

- **Il link del login va aperto nello stesso browser.** Il browser interno di VS Code, Chrome e l'app Android sono tre "dispositivi" diversi, ognuno con i suoi dati e il suo login.
- **Nell'app Android usa il codice**, non il link.
- **La chiave di intervals.icu va inserita su ogni dispositivo**: non viene sincronizzata, apposta.
- **Aggiorna l'APK** quando l'app chiede di aggiornare per sincronizzare: significa che il sito ha una versione dei dati più nuova.
- **Notifica di fine recupero in ritardo?** Android → Impostazioni → App → My Masterpiece → Batteria → **Senza restrizioni**.
- **Cancellare i dati del browser** (o disinstallare l'app senza account) cancella i dati di quel dispositivo: con l'account tornano dal server; senza, solo da un export.
- **RPE sempre**: senza, le analisi del carico sono incomplete.
- **Tasto Indietro** (app Android): con una finestra aperta (riepilogo dell'allenamento, eseguito, scelta di un esercizio) la chiude e resti nella pagina; senza finestre torna alla pagina precedente. L'allenamento in corso resta salvato.
- **Avviso rosso in alto**:
  - "Salvataggio non disponibile": il database del dispositivo non si è aperto e ciò che vedi è solo in memoria. Sincronizzazione e strumenti del server sono bloccati apposta. Chiudi e riapri l'app; se continua, libera spazio sul telefono.
  - "Salvataggio non riuscito": l'ultima modifica potrebbe non essere salvata. **Ricarica** e controlla.
  - "Aggiorna l'app": i dati del dispositivo sono di una versione più nuova; l'app resta in sola lettura finché non la aggiorni.
- **"Qualcosa è andato storto"** al posto di una pagina: i dati non sono stati toccati. **Ricarica**, o vai ad altre pagine dal menu.

---

# Parte 2 – Amministrare

> **Se leggi solo una cosa:** la manutenzione è un controllo da 10 minuti al mese, più poche azioni quando succede qualcosa. È tutto in [§18 Manutenzione](#18-manutenzione-cosa-fare-e-quando). Le altre sezioni servono come riferimento.

## 9. Mappa dei servizi

| Servizio          | A cosa serve                                                       | Dove                                                                    | Costo                      |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------- |
| **Supabase**      | Login, database dei dati sincronizzati, spazio per i file FIT      | [supabase.com/dashboard](https://supabase.com/dashboard)                | Piano gratuito             |
| **Vercel**        | Pubblica il sito a ogni push su `main`                             | [vercel.com/dashboard](https://vercel.com/dashboard)                    | Piano Hobby (gratuito)     |
| **GitHub**        | Codice, costruzione dell'APK, Release, ping anti-pausa di Supabase | [AleCovi04/My-Masterpiece](https://github.com/AleCovi04/My-Masterpiece) | Gratuito                   |
| **Resend**        | Invia le email del login (con il codice)                           | [resend.com](https://resend.com)                                        | Piano gratuito             |
| **intervals.icu** | Ponte con Garmin Connect                                           | [intervals.icu](https://intervals.icu)                                  | Gratuito                   |
| **OpenStreetMap** | Tessere della mappa nella pagina Attività                          | —                                                                       | Gratuito, con attribuzione |

Come si parlano: il **telefono/PC** usa l'app (dal sito Vercel o dall'APK) → l'app legge e scrive su **Supabase** → Supabase manda le email tramite **Resend**. **GitHub** costruisce l'APK e ogni 3 giorni "sveglia" Supabase. **intervals.icu** riceve le attività da Garmin e l'app le chiede direttamente dal dispositivo.

## 10. Chiavi: cosa è pubblico e cosa no

| Chiave                                                  | Dove sta                                                   | Si può condividere?                                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| URL del progetto Supabase                               | Vercel, `.env.local`, segreti GitHub                       | Sì: finisce nell'app                                                                                            |
| Chiave **publishable** di Supabase (`sb_publishable_…`) | Vercel, `.env.local`, segreti GitHub                       | Sì: finisce nell'app. I dati li protegge la Row Level Security (ognuno vede solo i suoi)                        |
| Chiave **secret / service_role** di Supabase            | Solo nella dashboard di Supabase                           | **Mai.** Non metterla nell'app, né su GitHub, né in chat                                                        |
| Password del database Supabase                          | Solo tua (gestore di password)                             | **Mai.** L'app non la usa                                                                                       |
| Chiave API di Resend (`re_…`)                           | Solo in Supabase → SMTP                                    | **Mai**                                                                                                         |
| Chiave di firma Android + password                      | `Documenti\MyMasterpiece-chiave-android\` e segreti GitHub | **Mai.** Tienine una copia di sicurezza (es. Drive): senza, gli aggiornamenti richiedono di disinstallare l'app |
| Chiave API di intervals.icu                             | Solo sul dispositivo (Dati → Garmin)                       | **Mai**                                                                                                         |

Il repository è **pubblico**: niente chiavi segrete nel codice, nei commit o nelle issue. `.env.local` non va su git (è già escluso).

## 11. Supabase

**Cosa c'è:** la tabella `items` (tutti i dati sincronizzati, una riga per voce), la funzione `push_items`, il bucket privato `fit` per i file FIT, le regole di sicurezza (RLS) e i permessi (`grant`). Tutto è descritto in [`supabase/schema.sql`](../supabase/schema.sql).

**Quando rieseguire lo schema:** ogni volta che `supabase/schema.sql` cambia (lo dice il riepilogo della modifica). Supabase → **SQL Editor** → **New query** → incolla tutto il file → **Run**. Si può rieseguire senza perdere dati.

**Impostazioni da conoscere:**

- **Authentication → URL Configuration:** _Site URL_ = `https://my-masterpiece.vercel.app`; _Redirect URLs_ = il sito e `http://localhost:5173`. Se cambi indirizzo del sito, aggiornali o il link del login non funziona.
- **Authentication → Emails → SMTP Settings:** SMTP di Resend (vedi [§15](#15-resend-email-del-login)). Nei modelli **Magic Link** e **Confirm signup** c'è la riga con `{{ .Token }}`: è il codice. Non toglierla.
- **Authentication → Rate Limits:** limite di email all'ora (alzalo se servono più login ravvicinati).
- **Authentication → Sign In / Providers → User Signups:** **Allow new users to sign up** disattivato (iscrizioni chiuse: URL e chiave del sito sono pubblici, chiunque potrebbe creare account e riempire lo spazio gratuito) e **Confirm email** attivo. Da riaprire solo quando l'app diventerà multi-utente.
- **Storage:** deve esserci il bucket `fit`, privato.

**Pausa del piano gratuito:** dopo 7 giorni senza attività Supabase mette in pausa il progetto. Il workflow `Supabase keep-alive` lo evita con una lettura ogni 3 giorni. Se va comunque in pausa: arriva un'email, l'app mostra "Sincronizzazione non riuscita" ma funziona offline. Dashboard → progetto → **Restore project**; dopo qualche minuto la sincronizzazione riparte da sola.

**Limiti del piano gratuito** (indicativi, controlla in **Organization → Usage** o nell'app in **Dati → Spazio sul server**): database 500 MB, Storage 1 GB. I file FIT sono la parte che cresce di più (vengono caricati compressi). Bastano per anni; cosa fare se si riempiono, a livelli e senza perdere dati: [docs/spazio-dati.md](spazio-dati.md).

**Non fare:** cancellare righe da `items` o file dal bucket `fit` a mano (server e dispositivi si disallineano: per liberare spazio c'è **Libera spazio**, per ripartire **Ricomincia da zero**, per riallineare **Strumenti avanzati → Ricarica il server**; vedi [docs/spazio-dati.md](spazio-dati.md)), disattivare la RLS, usare la chiave `service_role` nell'app.

## 12. Vercel (il sito)

- Ogni **push su `main`** pubblica il sito in un paio di minuti. Stato: dashboard → progetto → **Deployments**.
- Variabili: **Settings → Environment Variables**: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. **Una variabile cambiata vale solo dopo un nuovo deploy**: Deployments → ultimo → ⋯ → **Redeploy**.
- Se il sito mostra "Sincronizzazione non configurata", mancano le due variabili nel deploy.
- Tornare indietro: Deployments → un deploy precedente funzionante → ⋯ → **Promote to Production**.

## 13. GitHub

- **Segreti** ([Settings → Secrets → Actions](https://github.com/AleCovi04/My-Masterpiece/settings/secrets/actions)): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (anti-pausa e APK), `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD` (firma dell'APK).
- **Workflow** ([Actions](https://github.com/AleCovi04/My-Masterpiece/actions)):
  - **Supabase keep-alive** – ogni 3 giorni, da solo. Deve essere verde. Se è rosso controlla i segreti o se il progetto è in pausa.
  - **Android APK** – costruisce l'APK e lo pubblica nelle Release (avvio a mano o con un tag `v*`).
- GitHub disattiva i workflow programmati dopo **60 giorni senza commit** nel repository: arriva un'email; riattivalo da Actions → Supabase keep-alive → **Enable workflow**.

## 14. App Android (APK)

**Pubblicare una versione numerata** (1.1.0, 1.2.0…): segui [`docs/release-checklist.md`](release-checklist.md) (export, Supabase, merge, tag `vX.Y.Z`, installazione, verifiche). La versione dell'app è in `package.json` e si vede in fondo a **Dati**.

**Costruire una build intermedia:** GitHub → [Actions → Android APK](https://github.com/AleCovi04/My-Masterpiece/actions/workflows/android-apk.yml) → **Run workflow** (5–10 minuti) → dal telefono [Releases → ultima](https://github.com/AleCovi04/My-Masterpiece/releases/latest) → scarica e installa sopra la vecchia.

Quando serve: dopo modifiche all'app che vuoi sul telefono, e **sempre** quando cambia la versione dello schema dei dati (altrimenti l'APK vecchio smette di sincronizzare e chiede di aggiornare).

**Chiave di firma:** è in `Documenti\MyMasterpiece-chiave-android\`, mai su git (`android/.gitignore` esclude `*.jks`, `*.keystore`, `*.p12`). Se la perdi, il nuovo APK non si installa sopra il vecchio: va disinstallata l'app (i dati tornano dal server dopo il login) e serve una chiave nuova nei segreti GitHub.

Dettagli tecnici: l'app è la stessa del sito impacchettata con Capacitor (cartella `android/`); icone da `python scripts/make-icons.py`; Java e Android SDK non servono sul PC, costruisce tutto GitHub.

## 15. Resend (email del login)

Supabase invia le email del login tramite l'SMTP di Resend: mittente `onboarding@resend.dev`, host `smtp.resend.com`, porta `465`, utente `resend`, password = chiave API di Resend.

**Limite importante:** senza un dominio verificato Resend invia **solo all'indirizzo dell'account Resend**. Va bene finché l'utente sei solo tu. Per altri utenti serve un dominio tuo: Resend → **Domains** → **Add domain** → aggiungi i record DNS indicati → poi in Supabase cambia il mittente in un indirizzo di quel dominio.

Piano gratuito: circa 100 email al giorno e 3.000 al mese.

Se le email non arrivano: controlla lo spam, poi Resend → **Emails** (log degli invii), poi Supabase → **Authentication → Logs**.

## 16. intervals.icu e Garmin

1. Crea un account su [intervals.icu](https://intervals.icu) → **Settings** → **Connections** → **Garmin Connect** → **Connect**. Da allora le attività dell'orologio arrivano lì da sole.
2. **Settings** → in fondo **Developer Settings**: copia l'**Athlete ID** (inizia con `i`) e genera la **API Key**.
3. Nell'app, su **ogni dispositivo**: **Dati** → **Garmin tramite intervals.icu** → ID e chiave → **Collega**.

Se Garmin smette di arrivare: su intervals.icu controlla che la connessione con Garmin sia ancora attiva; se hai rigenerato la chiave API, reinseriscila su ogni dispositivo.

## 17. Se qualcosa si rompe

| Sintomo                                                                     | Causa probabile                                                        | Cosa fare                                                                                |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Icona "Sincronizzazione non riuscita"                                       | Progetto Supabase in pausa, o rete assente                             | Dashboard Supabase → **Restore project**; l'app intanto funziona offline                 |
| "Aggiorna l'app per sincronizzare"                                          | APK più vecchio del sito                                               | Nuovo APK ([§14](#14-app-android-apk))                                                   |
| "Sincronizzazione non configurata"                                          | Variabili mancanti su Vercel                                           | [§12](#12-vercel-il-sito): aggiungi le variabili e rifai il deploy                       |
| L'email del login non arriva                                                | Limite di Resend o di Supabase, spam, indirizzo diverso da Resend      | [§15](#15-resend-email-del-login); aspetta qualche minuto e riprova                      |
| Il link del login apre l'app "non collegata"                                | Link aperto in un altro browser                                        | Usa il **codice**, o apri il link nel browser da cui l'hai chiesto                       |
| Le attività Garmin non compaiono                                            | Chiave intervals.icu mancante su quel dispositivo, o Garmin scollegato | [§16](#16-intervalsicu-e-garmin)                                                         |
| L'import delle attività non si sincronizza                                  | Bucket `fit` mancante                                                  | Riesegui `supabase/schema.sql` ([§11](#11-supabase))                                     |
| Errore di permessi (`permission denied`) nei log                            | Schema non rieseguito dopo una modifica                                | Riesegui `supabase/schema.sql`                                                           |
| Il workflow keep-alive è rosso                                              | Segreti mancanti o progetto in pausa                                   | Controlla i segreti ([§13](#13-github)) e lo stato del progetto                          |
| Notifica di recupero in ritardo                                             | Risparmio energetico di Android                                        | Batteria → **Senza restrizioni**                                                         |
| Dati spariti su un dispositivo                                              | Dati del browser cancellati / altro browser                            | Accedi con l'account; senza account: **Dati** → ripristina un backup o importa un export |
| Il sito nuovo è rotto                                                       | Ultimo deploy difettoso                                                | Vercel → deploy precedente → **Promote to Production**                                   |
| "Manca il permesso" (Libera spazio, Ricomincia da zero, Ricarica il server) | Schema non rieseguito                                                  | Riesegui `supabase/schema.sql` ([§11](#11-supabase))                                     |
| Server e dispositivi mostrano dati diversi                                  | Cancellazioni fatte a mano su Supabase                                 | Dal dispositivo giusto: **Dati → Strumenti avanzati → Ricarica il server**               |
| Avviso rosso "Salvataggio non disponibile"                                  | Database del dispositivo non apribile (spazio pieno, browser)          | Non usare gli strumenti del server; chiudi e riapri l'app, libera spazio                 |
| Avviso rosso "Aggiorna l'app"                                               | Dati salvati da una versione più nuova (es. sito tornato indietro)     | Aggiorna l'APK o ricarica il sito con la versione nuova                                  |
| "Questa email non ha un account"                                            | Iscrizioni chiuse, email sbagliata                                     | Controlla l'email; per un utente nuovo riapri le iscrizioni ([§11](#11-supabase))        |
| "Qualcosa è andato storto" al posto di una pagina                           | Errore nell'app su quella pagina                                       | **Ricarica**; se si ripete, segnala la pagina e il messaggio mostrato                    |

## 18. Manutenzione: cosa fare e quando

In breve: **10 minuti al mese**, più qualche azione solo quando succede qualcosa. Il resto va da solo.

### Cosa va da solo (non devi fare niente)

| Cosa                                          | Chi lo fa        | Ogni quanto                        |
| --------------------------------------------- | ---------------- | ---------------------------------- |
| Tenere sveglio Supabase (evita la pausa)      | GitHub Actions   | Ogni 3 giorni                      |
| Pubblicare il sito dopo una modifica          | Vercel           | A ogni push su `main`              |
| Backup dei dati sul dispositivo               | L'app            | Ogni 7 giorni (tiene gli ultimi 8) |
| Sincronizzare telefono e PC                   | L'app + Supabase | A ogni modifica                    |
| Portare le attività da Garmin a intervals.icu | intervals.icu    | A ogni allenamento                 |

### Ogni mese: il controllo da 10 minuti

Scegli un giorno fisso (es. il primo del mese) e segui l'ordine:

| #   | Cosa                                 | Come                                                                                                                                                                                                             | Se lo salti                                                                             |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | **Export dei dati**                  | Dal PC, nel browser: **Dati** → **Esporta tutto (JSON)** → salva il file su Drive                                                                                                                                | Se Supabase e il telefono si perdessero insieme, non avresti una copia                  |
| 2   | **Anti-pausa attivo e verde**        | GitHub → [Actions → Supabase keep-alive](https://github.com/AleCovi04/My-Masterpiece/actions/workflows/supabase-keepalive.yml): le ultime esecuzioni sono verdi. Se c'è il pulsante **Enable workflow**, premilo | Supabase va in pausa dopo 7 giorni: la sincronizzazione si ferma finché non lo riattivi |
| 3   | **Spazio su Supabase**               | Nell'app **Dati** → **Spazio sul server** (o Supabase → **Organization** → **Usage**): barre verdi = tutto bene; gialle o rosse = [docs/spazio-dati.md](spazio-dati.md)                                          | Superati i limiti, i nuovi dati e i file FIT non si salvano più sul server              |
| 4   | **Sincronizzazione sui dispositivi** | Apri l'app sul telefono e sul PC: l'icona in alto è verde e vedi gli stessi allenamenti                                                                                                                          | Un dispositivo potrebbe lavorare da solo senza che te ne accorga                        |
| 5   | **Garmin arriva ancora**             | L'ultima attività dell'orologio compare nell'app (finestra **Collega** o **Calendario → Sincronizza Garmin**)                                                                                                    | Garmin a volte scollega intervals.icu: le attività smettono di arrivare in silenzio     |

### Ogni 6 mesi

| Cosa                                            | Come                                                                                                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Copia della chiave di firma Android**         | Controlla che la cartella `Documenti\MyMasterpiece-chiave-android\` esista ancora **e** che ci sia una copia altrove (Drive). Senza, niente aggiornamenti dell'APK sopra quello installato |
| **APK aggiornato** (di solito te lo dice l'app) | Confronta la versione sul telefono con l'ultima [Release](https://github.com/AleCovi04/My-Masterpiece/releases/latest); se è più vecchia, installa la nuova ([§14](#14-app-android-apk))   |
| **Prova di ripristino** (facoltativa)           | Su un browser dove non usi l'app: **Dati** → **Importa** l'ultimo export e controlla che i dati ci siano. Così sai che il backup funziona davvero                                          |

### Solo quando succede qualcosa

| Quando                                                                                                          | Cosa fare                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Il riepilogo di una modifica dice che `supabase/schema.sql` è cambiato                                          | Rieseguilo: Supabase → **SQL Editor** → **New query** → incolla tutto il file → **Run** ([§11](#11-supabase))                  |
| Il riepilogo dice che è cambiata la versione dello schema dei dati, o l'app chiede "aggiorna per sincronizzare" | Nuovo APK sul telefono ([§14](#14-app-android-apk))                                                                            |
| Arriva un'email di Supabase "project paused"                                                                    | Dashboard Supabase → progetto → **Restore project**; poi controlla l'anti-pausa (punto 2 del mese)                             |
| Arriva un'email di GitHub su un workflow fallito o disattivato                                                  | Punto 2 del mese: riattivalo o guarda l'errore ([§13](#13-github))                                                             |
| Cambi telefono o PC                                                                                             | Installa l'app, accedi con il **codice**, reinserisci la chiave di intervals.icu ([§16](#16-intervalsicu-e-garmin))            |
| Lo Storage supera l'80 % (barra rossa in **Dati → Spazio sul server**)                                          | Dal PC: **Libera spazio** ([docs/spazio-dati.md](spazio-dati.md), livello 2)                                                   |
| Vuoi ripartire da zero (es. inizio della preparazione)                                                          | Riesegui `supabase/schema.sql` se è cambiato → su un dispositivo **Dati → Ricomincia da zero** → gli altri si svuotano da soli |
| Pubblichi una nuova versione                                                                                    | [`docs/release-checklist.md`](release-checklist.md)                                                                            |
| Qualcosa non funziona                                                                                           | Tabella [§17](#17-se-qualcosa-si-rompe)                                                                                        |

**Quando lo sviluppo si ferma** (dopo la versione 1): GitHub disattiva i workflow programmati se il repository resta **60 giorni senza commit**. Il controllo mensile (punto 2) lo intercetta; se vuoi evitarlo del tutto, fai un piccolo commit ogni mese o chiedi a Claude di farlo.

## 19. Partire da zero (nuovo progetto)

Serve solo se ricrei tutto (nuovo progetto Supabase, nuovo account).

1. **Supabase:** **New project** (piano gratuito, regione europea). **SQL Editor** → incolla [`supabase/schema.sql`](../supabase/schema.sql) → **Run**. **Authentication → URL Configuration** come in [§11](#11-supabase).
2. **Chiavi:** **Project Settings → API Keys** → copia la _Publishable key_; **Project Settings → Data API** → copia il _Project URL_. Mettile in `.env.local` (copia di `.env.example`), su Vercel e nei segreti GitHub.
3. **Resend:** account con la tua email → **API Keys** → **Create API Key** → Supabase → **Authentication → Emails → SMTP Settings** con i dati di [§15](#15-resend-email-del-login). Nei modelli **Magic Link** e **Confirm signup** aggiungi `<p>Codice: <strong>{{ .Token }}</strong></p>`.
4. **GitHub:** segreti di [§13](#13-github); lancia **Supabase keep-alive** a mano per provarlo.
5. **Vercel:** importa il repository, aggiungi le due variabili, deploy.
6. **App:** accedi dal dispositivo con i dati veri per primo (i suoi dati vanno sul server), poi dagli altri.
