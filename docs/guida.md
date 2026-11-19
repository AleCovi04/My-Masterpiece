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
18. [Controlli periodici](#18-controlli-periodici)
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

**Aggiornare l'APK:** l'app non si aggiorna da sola. Quando c'è una versione nuova scarica il nuovo APK dalla stessa pagina e installalo sopra il vecchio: i dati restano. Il sito e la PWA invece si aggiornano da soli alla riapertura.

## 2. Accedere e sincronizzare

L'app funziona anche **senza account**, ma i dati restano solo su quel dispositivo. Con l'account si sincronizzano tra telefono e PC.

1. **Dati** → **Account e sincronizzazione** → scrivi la tua email → **Inviami il link** (l'email contiene anche il codice).
2. Arriva un'email con un **codice** e un **link**:
   - **app Android:** digita il **codice** (il link aprirebbe il browser, non l'app);
   - **browser:** codice oppure link, ma il link va aperto **nello stesso browser** da cui l'hai chiesto.
3. La prima volta l'app salva un backup ("Prima del collegamento all'account") e poi unisce i dati con quelli del server.

L'icona nell'intestazione mostra lo stato: sincronizzato, in corso, offline, errore. Senza rete l'app funziona lo stesso e manda le modifiche appena torna online. Se due dispositivi modificano la stessa voce, **vince la modifica più recente**.

**Uscire** dall'account non cancella i dati dal dispositivo.

## 3. Il percorso: Forger → Il Piano → Calendario

- **Forger** – la libreria: esercizi, allenamenti (forza, corsa/bici/nuoto, brick), **blocchi** (1–12 settimane tipo) e **fasi** (sequenze di blocchi). Qui si crea, non si mette niente in calendario.
- **Il Piano** – mette fasi e blocchi in calendario da un lunedì (in coda alle sedute o sostituendo le programmate). Mostra la cronologia, il completamento per fase, blocco e settimana e il traguardo della gara. Da qui si può anche **rimuovere** un'applicazione (solo le sedute ancora programmate).
- **Calendario** – viste Settimana, Mese e Anno. Il **+** aggiunge una seduta (da un allenamento o vuota); tenendo premuta una seduta la sposti. I colori nei giorni passati: verde tutte svolte, arancione in parte, rosso nessuna.
- **Panoramica** – la settimana in corso, il carico e i giorni alla gara. Nel riquadro rosso tocca **Obiettivo** per scrivere il tuo (es. "70.3": l'app mostra "Road to 70.3" anche sotto il logo) e **Data gara** per scegliere la data. Valgono su tutti i dispositivi.

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
- **Export**: **Dati** → **Esporta** scarica un file `.json` con tutti i dati. Fallo ogni tanto e salvalo fuori dal telefono (Drive, PC): è l'unica copia che non dipende da Supabase.
- **Import**: **Dati** → **Importa** un file esportato (prima l'app salva un backup).

## 8. A cosa stare attento

- **Il link del login va aperto nello stesso browser.** Il browser interno di VS Code, Chrome e l'app Android sono tre "dispositivi" diversi, ognuno con i suoi dati e il suo login.
- **Nell'app Android usa il codice**, non il link.
- **La chiave di intervals.icu va inserita su ogni dispositivo**: non viene sincronizzata, apposta.
- **Aggiorna l'APK** quando l'app chiede di aggiornare per sincronizzare: significa che il sito ha una versione dei dati più nuova.
- **Notifica di fine recupero in ritardo?** Android → Impostazioni → App → My Masterpiece → Batteria → **Senza restrizioni**.
- **Cancellare i dati del browser** (o disinstallare l'app senza account) cancella i dati di quel dispositivo: con l'account tornano dal server; senza, solo da un export.
- **RPE sempre**: senza, le analisi del carico sono incomplete.

---

# Parte 2 – Amministrare

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
- **Storage:** deve esserci il bucket `fit`, privato.

**Pausa del piano gratuito:** dopo 7 giorni senza attività Supabase mette in pausa il progetto. Il workflow `Supabase keep-alive` lo evita con una lettura ogni 3 giorni. Se va comunque in pausa: arriva un'email, l'app mostra "Sincronizzazione non riuscita" ma funziona offline. Dashboard → progetto → **Restore project**; dopo qualche minuto la sincronizzazione riparte da sola.

**Limiti del piano gratuito** (indicativi, controlla in **Organization → Usage**): database 500 MB, Storage 1 GB. I file FIT sono la parte che cresce di più (circa 0,1–1 MB l'uno).

**Non fare:** cancellare righe da `items` a mano (per l'app sparirebbero senza traccia: meglio cancellare dall'app), disattivare la RLS, usare la chiave `service_role` nell'app.

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

**Costruire una nuova versione:** GitHub → [Actions → Android APK](https://github.com/AleCovi04/My-Masterpiece/actions/workflows/android-apk.yml) → **Run workflow** (5–10 minuti) → dal telefono [Releases → ultima](https://github.com/AleCovi04/My-Masterpiece/releases/latest) → scarica e installa sopra la vecchia.

Quando serve: dopo modifiche all'app che vuoi sul telefono, e **sempre** quando cambia la versione dello schema dei dati (altrimenti l'APK vecchio smette di sincronizzare e chiede di aggiornare).

**Chiave di firma:** è in `Documenti\MyMasterpiece-chiave-android\`, mai su git. Se la perdi, il nuovo APK non si installa sopra il vecchio: va disinstallata l'app (i dati tornano dal server dopo il login) e serve una chiave nuova nei segreti GitHub.

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

| Sintomo                                          | Causa probabile                                                        | Cosa fare                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Icona "Sincronizzazione non riuscita"            | Progetto Supabase in pausa, o rete assente                             | Dashboard Supabase → **Restore project**; l'app intanto funziona offline                 |
| "Aggiorna l'app per sincronizzare"               | APK più vecchio del sito                                               | Nuovo APK ([§14](#14-app-android-apk))                                                   |
| "Sincronizzazione non configurata"               | Variabili mancanti su Vercel                                           | [§12](#12-vercel-il-sito): aggiungi le variabili e rifai il deploy                       |
| L'email del login non arriva                     | Limite di Resend o di Supabase, spam, indirizzo diverso da Resend      | [§15](#15-resend-email-del-login); aspetta qualche minuto e riprova                      |
| Il link del login apre l'app "non collegata"     | Link aperto in un altro browser                                        | Usa il **codice**, o apri il link nel browser da cui l'hai chiesto                       |
| Le attività Garmin non compaiono                 | Chiave intervals.icu mancante su quel dispositivo, o Garmin scollegato | [§16](#16-intervalsicu-e-garmin)                                                         |
| L'import delle attività non si sincronizza       | Bucket `fit` mancante                                                  | Riesegui `supabase/schema.sql` ([§11](#11-supabase))                                     |
| Errore di permessi (`permission denied`) nei log | Schema non rieseguito dopo una modifica                                | Riesegui `supabase/schema.sql`                                                           |
| Il workflow keep-alive è rosso                   | Segreti mancanti o progetto in pausa                                   | Controlla i segreti ([§13](#13-github)) e lo stato del progetto                          |
| Notifica di recupero in ritardo                  | Risparmio energetico di Android                                        | Batteria → **Senza restrizioni**                                                         |
| Dati spariti su un dispositivo                   | Dati del browser cancellati / altro browser                            | Accedi con l'account; senza account: **Dati** → ripristina un backup o importa un export |
| Il sito nuovo è rotto                            | Ultimo deploy difettoso                                                | Vercel → deploy precedente → **Promote to Production**                                   |

## 18. Controlli periodici

**Ogni mese (5 minuti):**

- [ ] GitHub → Actions → **Supabase keep-alive** verde.
- [ ] Supabase → **Organization → Usage**: database e Storage lontani dai limiti.
- [ ] Nell'app: **Dati** → **Esporta** e salva il file fuori dal telefono.
- [ ] L'icona di sincronizzazione è verde su telefono e PC.

**Ogni tanto:**

- [ ] Copia di sicurezza della chiave di firma Android ancora presente.
- [ ] APK sul telefono aggiornato all'ultima release.

## 19. Partire da zero (nuovo progetto)

Serve solo se ricrei tutto (nuovo progetto Supabase, nuovo account).

1. **Supabase:** **New project** (piano gratuito, regione europea). **SQL Editor** → incolla [`supabase/schema.sql`](../supabase/schema.sql) → **Run**. **Authentication → URL Configuration** come in [§11](#11-supabase).
2. **Chiavi:** **Project Settings → API Keys** → copia la _Publishable key_; **Project Settings → Data API** → copia il _Project URL_. Mettile in `.env.local` (copia di `.env.example`), su Vercel e nei segreti GitHub.
3. **Resend:** account con la tua email → **API Keys** → **Create API Key** → Supabase → **Authentication → Emails → SMTP Settings** con i dati di [§15](#15-resend-email-del-login). Nei modelli **Magic Link** e **Confirm signup** aggiungi `<p>Codice: <strong>{{ .Token }}</strong></p>`.
4. **GitHub:** segreti di [§13](#13-github); lancia **Supabase keep-alive** a mano per provarlo.
5. **Vercel:** importa il repository, aggiungi le due variabili, deploy.
6. **App:** accedi dal dispositivo con i dati veri per primo (i suoi dati vanno sul server), poi dagli altri.
