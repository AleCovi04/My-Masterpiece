# Review pre-release v1.1

Revisione di tutto il progetto prima della v1.1, la prima versione ufficiale, pensata per l'uso quotidiano per circa 2 anni (telefono con l'APK, PC con il browser).

**Stato di partenza** (commit `d54e228`): `npm test` 266/266 ✓ · `npm run lint` ✓ · nessun segreto nella cronologia git (91 commit) · nessun file di chiavi mai committato · nessun `dangerouslySetInnerHTML` o `eval`.

**Come è stata fatta:** dati, sincronizzazione, sicurezza e Android/PWA letti riga per riga; Garmin, allenamento live, calcoli, UI e test con controlli mirati sui file critici (lettura dei moduli principali, ricerche su tutto `src/`). Ogni problema è stato verificato sul codice.

## Come leggere

- **Bloccante (v1.1):** può causare perdita di dati, rischi di sicurezza, rotture della sincronizzazione o funzioni principali che non funzionano. Va corretto prima del release.
- **Miglioramento (v1.2):** tutto il resto, come note.
- Per ogni voce: **Dove** · **Cosa può succedere** · **Gravità** · **Soluzione proposta**.

## Riepilogo dei bloccanti

| ID  | Problema                                                           | Gravità                             | Impegno |
| --- | ------------------------------------------------------------------ | ----------------------------------- | ------- |
| B1  | Elenchi vecchi sovrascrivono dati più nuovi                        | Alta: perdita di dati ovunque       | Medio   |
| B2  | Un cambio di sola posizione riscrive intere sedute                 | Alta: perdita di dati offline       | Piccolo |
| B3  | Avvio "solo in memoria" silenzioso, errori di salvataggio nascosti | Alta                                | Medio   |
| B4  | Migrazioni e sincronizzazione (preventivo)                         | Alta alla prima migrazione/rollback | Medio   |
| B5  | Pulizia automatica delle cancellazioni dopo 90 giorni              | Media                               | Piccolo |
| B6  | Download dal server a pagine con offset                            | Media (bassa probabilità)           | Piccolo |
| B7  | Iscrizioni aperte su Supabase                                      | Media (configurazione)              | Piccolo |
| B8  | "Esporta tutto" nell'APK non salva nulla ma risulta fatto          | Alta (falsa sicurezza)              | Piccolo |
| B9  | Nessun Error Boundary: schermo bianco                              | Media                               | Piccolo |

## Bloccanti per la v1.1

### B1 — Elenchi vecchi sovrascrivono dati più nuovi

- **Dove:** `src/features/live/hooks.ts:33-98` (la schermata live legge le sedute una volta sola, senza `useDataRevision`; `finish` e `cancel` salvano quella copia); `src/app/AppShell.tsx:46` (la finestra "Collega" di Garmin può aprirsi su qualsiasi pagina, anche sopra il live); `src/features/garmin/importer.ts:80-137` (l'elenco `imports` letto prima della scelta della seduta viene salvato dopo); stesso schema "copia in React → salva l'elenco intero" in `useCalendarSessions.ts:60`, `useExercises.ts:34`, `useTemplates.ts:31`, `usePlanning.ts:109-155`, `useAnalysisData.ts:46`; `src/data/dexieStore.ts:181-209` (`writeList` deduce le cancellazioni da ciò che manca nell'elenco passato).
- **Cosa può succedere:** al mattino corri, la sera apri l'allenamento di forza; durante l'allenamento compare "Collega" e importi la corsa. A **Termina** l'app salva l'elenco delle sedute letto all'apertura del live: la corsa torna "programmata" senza eseguito, e l'attività non viene più riproposta (il record di import resta). Allo stesso modo le sedute create sul PC e arrivate con la sincronizzazione durante l'allenamento vengono **cancellate su tutti i dispositivi**. Con due schede aperte sul PC (nessun avviso tra schede) la scheda rimasta indietro cancella ciò che è stato creato nell'altra. Negli altri hook la finestra di rischio è piccola (millisecondi tra l'arrivo dei dati e il ricaricamento), nel live dura tutto l'allenamento.
- **Gravità:** Alta — perdita di dati propagata a tutti i dispositivi, in un uso normale (doppia seduta nello stesso giorno).
- **Soluzione proposta:** nuova operazione `dataStore.update(elenchi, fn)` che legge, modifica e salva in **una sola transazione** Dexie (nessuna sincronizzazione può infilarsi in mezzo e nessuna copia vecchia viene salvata). La usano tutti gli hook che salvano, `finish`/`cancel` del live, l'import Garmin, "ignora" e "Libera spazio". **Test:** modifica arrivata durante il live resta dopo Termina; un salvataggio calcolato su una copia vecchia non cancella le voci arrivate dopo (anche da una seconda istanza dello store, cioè un'altra scheda).

### B2 — Un cambio di sola posizione riscrive intere sedute

- **Dove:** `src/lib/sessions.ts:100-115` (`renumber` toglie le sedute del giorno dall'elenco e le rimette **in fondo**; la usano inserisci, elimina, duplica, applica/rimuovi fase o blocco, seduta non pianificata dell'import Garmin); `src/data/dexieStore.ts:196-207` (se cambia la posizione nell'elenco, la voce riceve un'ora di modifica nuova e va in coda); `dexieStore.ts:403-410` (una voce remota più vecchia della modifica locale in coda viene ignorata).
- **Cosa può succedere:** in palestra senza rete registri l'allenamento sul telefono (resta in coda). A casa, sul PC, aggiungi o elimini una seduta: decine o centinaia di sedute cambiano posizione, ricevono un'ora più recente e partono verso il server con il contenuto che ha il PC. Quando il telefono torna online, la versione del PC è "più nuova" e **l'allenamento registrato può essere sovrascritto**. Inoltre ogni operazione invia e riscarica MB di dati (con 2 anni di storico), consumando la quota gratuita di Supabase, e le posizioni diverse tra dispositivi si rimbalzano a ogni salvataggio.
- **Gravità:** Alta — perdita di dati nell'uso offline, che è uno dei casi d'uso principali.
- **Soluzione proposta:** in `writeList`, se cambia solo la posizione (contenuto identico) si aggiorna `pos` sul dispositivo **senza** nuova ora e **senza** coda (gli elenchi non sono riordinabili a mano: la posizione non è un dato dell'utente); `renumber` lascia le sedute al loro posto e aggiunge in fondo solo quelle nuove. **Test** a due dispositivi: telefono offline registra, PC elimina una seduta precedente → dopo la sincronizzazione l'allenamento c'è; aggiungere una seduta mette in coda una sola voce.

### B3 — Avvio "solo in memoria" silenzioso ed errori di salvataggio nascosti

- **Dove:** `src/data/dexieStore.ts:282-306` (il backup automatico settimanale è dentro l'avvio: se fallisce, per esempio con la memoria del telefono piena, oppure se fallisce una migrazione o l'apertura del database, l'app passa ai dati **solo in memoria**); `:314-325`, `:525-534`, `:621-633` (gli errori di salvataggio finiscono solo in console); `src/data/sync/account.ts:221-232` (Ricarica il server cancella prima le righe del server, poi rimette in coda i dati locali: in memoria non c'è niente da rimettere); `:215-220` (Ricomincia da zero cancella tutti i FIT dal server); `src/data/sync/engine.ts:97-100` (`syncNow` non segnala mai un errore a chi la chiama).
- **Cosa può succedere:** l'app si apre **vuota**, senza avvisi, e la sincronizzazione dice "Sincronizzato"; tutto ciò che inserisci sparisce alla riapertura. Se, vedendo l'app vuota, premi **Ricarica il server**, il server viene svuotato e non ricaricato; **Ricomincia da zero** in quello stato cancella tutti i file FIT dal server. Un salvataggio fallito resta visibile a schermo ma non è salvato. Ricarica il server e Ricomincia da zero dicono "Fatto" anche se l'invio al server non è riuscito.
- **Gravità:** Alta.
- **Soluzione proposta:** il backup automatico che fallisce non blocca l'avvio (si riprova la volta dopo); il `dataStore` espone lo stato del salvataggio (normale, solo in memoria, dati più recenti dell'app, ultimo errore di scrittura) e l'app mostra un **avviso rosso fisso** (IT/EN) con cosa fare; in memoria la sincronizzazione resta spenta e Ricarica il server, Ricomincia da zero e Libera spazio sono disattivati; `syncNow` restituisce l'esito e gli strumenti del server mostrano l'errore. **Test:** avvio con backup che fallisce apre comunque IndexedDB; in memoria rebuild e reset vengono rifiutati.

### B4 — Migrazioni e sincronizzazione (preventivo)

- **Dove:** `src/data/dexieStore.ts:273-279` (la migrazione all'avvio salva i dati come una modifica dell'utente: ogni voce migrata riceve l'ora di adesso e va in coda; le voci scartate dalla validazione diventano cancellazioni sul server); `:254-280` (nessun controllo se i dati salvati sono di una versione **più recente** dell'app); `:354` (le voci partono con la versione dello schema dell'app in esecuzione).
- **Cosa può succedere:** oggi lo schema è il 10 e la v1.1 non lo cambia, ma alla prima migrazione (v1.2 o dopo) il dispositivo aggiornato per ultimo riscrive tutte le voci migrate con un'ora nuova e **sovrascrive le modifiche fatte nel frattempo** sugli altri dispositivi già aggiornati (caso tipico: il sito si aggiorna da solo, l'APK qualche giorno dopo). Con un rollback del sito su Vercel, o un APK vecchio, l'app lavora su dati più nuovi di lei e li rimanda dichiarando la versione vecchia: gli altri dispositivi rifanno le migrazioni su dati già migrati. La guardia deve stare **nella v1.1**, perché è la versione a cui si tornerebbe con un rollback.
- **Gravità:** Alta alla prima migrazione o al primo rollback.
- **Soluzione proposta:** migrazione all'avvio che conserva l'ora di ogni voce e non mette nulla in coda (ogni dispositivo migra la propria copia; le voci dal server si migrano già all'arrivo); le voci scartate restano nel backup `pre-migration` e non diventano cancellazioni; se la versione salvata è più alta di quella dell'app: sola lettura, sincronizzazione spenta, avviso "aggiorna l'app". **Test** a due dispositivi con una migrazione finta; test della guardia.

### B5 — Pulizia automatica delle cancellazioni dopo 90 giorni

- **Dove:** `src/data/sync/account.ts:51-54, 100-118` (una volta a settimana chiama `purge_deleted_items` con 90 giorni); `supabase/schema.sql:114-128`; `src/data/sync/engine.ts:69-74` (i dispositivi scaricano solo le novità dal loro cursore); `src/data/dexieStore.ts:452-458` (rientrando nell'account tutte le voci locali vanno in coda).
- **Cosa può succedere:** un dispositivo rimasto inutilizzato per più di 90 giorni (il PC per una stagione, un vecchio telefono, il browser interno di VS Code) non riceve più le cancellazioni ripulite e mostra sedute "fantasma" (anche nelle analisi); se rientra nell'account, o se un giorno lo usi per Ricarica il server, quelle voci tornano sul server e **ricompaiono su tutti i dispositivi**.
- **Gravità:** Media.
- **Soluzione proposta:** togliere la pulizia automatica. Le righe delle voci cancellate pesano circa 300 byte: 1000 cancellazioni ≈ 0,3 MB su 500 MB. La funzione SQL resta per un uso manuale, con la condizione scritta in `docs/spazio-dati.md` (solo se tutti i dispositivi hanno sincronizzato di recente). Riconciliazione completa per i dispositivi fermi da molto: v1.2.

### B6 — Download dal server a pagine con offset

- **Dove:** `src/data/sync/supabaseRemote.ts:27-54` (pagine da 1000 righe con `range`, ordinate per `server_at`); `src/data/sync/engine.ts:89-92` (il cursore diventa l'ora più recente scaricata).
- **Cosa può succedere:** quando un dispositivo scarica più di 1000 righe (primo accesso su un telefono nuovo dopo mesi d'uso, oppure dopo una modifica di massa) e intanto un altro dispositivo modifica una riga già letta, quella riga si sposta in fondo e la prima riga della pagina successiva viene **saltata**; il cursore la supera e quella modifica non arriva mai: dispositivi disallineati senza avvisi.
- **Gravità:** Media (bassa probabilità, ma rottura silenziosa della sincronizzazione).
- **Soluzione proposta:** paginazione a chiave (`server_at`, `kind`, `id` maggiori dell'ultima riga letta) usando l'ora del server com'è, senza arrotondarla ai millisecondi. **Test** con un server finto che modifica righe durante il download.

### B7 — Iscrizioni aperte su Supabase

- **Dove:** `src/data/sync/account.ts:174-184` (`shouldCreateUser: true`); impostazioni di Authentication di Supabase (fuori dal repository).
- **Cosa può succedere:** URL e chiave publishable sono pubblici (stanno nel sito). Se le iscrizioni sono aperte, chiunque può creare un account e scrivere nelle **proprie** righe e nella propria cartella FIT (la RLS protegge i tuoi dati), riempiendo i 500 MB di database o 1 GB di Storage del piano gratuito: il progetto si blocca e la tua sincronizzazione smette di funzionare. Oggi lo frena solo il mittente di prova di Resend, che invia email solo al tuo indirizzo (e "Confirm email", se attivo).
- **Gravità:** Media (si chiude con una impostazione).
- **Soluzione proposta:** Supabase → Authentication → disattivare "Allow new users to sign up" e verificare che "Confirm email" sia attivo (passi nella checklist di release); nell'app un messaggio chiaro (IT/EN) se un'email non registrata prova ad accedere. Da riaprire quando l'app diventerà multi-utente.

### B8 — "Esporta tutto" nell'APK non salva nulla ma risulta fatto

- **Dove:** `src/features/data/DataPage.tsx:108-120` (download con `<a download>` e subito dopo `markExported`); `@capacitor/android` non gestisce i download (nessun `DownloadListener`), a differenza di **Libera spazio** che controlla già l'app nativa (`ArchiveDialog.tsx:38`); `docs/guida.md` §7 e §18 dicono di esportare dall'app.
- **Cosa può succedere:** dal telefono "Esporta tutto (JSON)" non produce nessun file, ma "Ultimo export manuale" si aggiorna e il promemoria dei 30 giorni sparisce: si crede di avere una copia che non esiste.
- **Gravità:** Alta per la sicurezza dei dati (è l'unica copia indipendente da Supabase).
- **Soluzione proposta:** nell'app Android, al posto del pulsante, la nota "L'export si fa dal PC (browser)" (come per Libera spazio) e nessun export registrato; guida aggiornata. L'export vero dal telefono richiede plugin nuovi (`@capacitor/filesystem`, condivisione): v1.2.

### B9 — Nessun Error Boundary

- **Dove:** `src/app/App.tsx`, `src/app/AppShell.tsx` (nel codice non c'è nessun Error Boundary).
- **Cosa può succedere:** qualsiasi errore durante il disegno di una pagina smonta tutta l'app: **schermo bianco**, senza modo di arrivare alla pagina Dati. Una voce arrivata dalla sincronizzazione con una forma inattesa (la validazione controlla solo pochi campi) può farlo su tutti i dispositivi insieme, finché non esce una correzione.
- **Gravità:** Media.
- **Soluzione proposta:** Error Boundary attorno alle pagine in AppShell (menu e intestazione restano usabili), con "Ricarica" e "Vai a Dati", testi IT/EN.

### B10, B11, B12 — aggiunti dopo l'approvazione

Spostati dalla v1.2 ai bloccanti su richiesta (dettagli nelle voci della v1.2 qui sotto): **B10** esclusione dei keystore in `android/.gitignore` (anche `*.p12`); **B11** tasto Indietro di Android con una finestra aperta (chiude la finestra senza cambiare pagina e senza perdere i campi); **B12** `viewport-fit=cover` e margini safe-area per intestazione, barra del recupero e sidebar.

## Decisioni da prendere prima delle correzioni

**Prese:** 1(a) branch `release-1.1`, 2(a) pulizia automatica tolta, 3(a) nota "export dal PC" nell'APK.

1. **Dove fare le correzioni.** (a) Branch `release-1.1`, che unisci tu durante il release (passo "merge" della checklist): il sito non cambia finché non decidi; l'APK di prova si costruisce dal branch con Run workflow. (b) Direttamente su `main`, come sempre: ogni push va subito online. **Consiglio (a)**: sono modifiche al cuore dei dati, meglio provarle prima.
2. **Pulizia delle cancellazioni (B5).** (a) Disattivarla. (b) Portarla a 365 giorni (riduce il rischio, non lo toglie). **Consiglio (a)**: lo spazio risparmiato è trascurabile.
3. **Export dal telefono (B8).** (a) Nota "fai l'export dal PC", nessuna dipendenza. (b) Export vero con `@capacitor/filesystem` e la condivisione di Android (due dipendenze nuove, APK da ricostruire e provare). **Consiglio (a)** per la v1.1, (b) in v1.2.

## Miglioramenti per la v1.2

### Dati e sincronizzazione

- **Ora del dispositivo sbagliata** — `supabase/schema.sql:48-79`: vince l'ora del dispositivo; un telefono con l'orologio avanti vince sempre e le modifiche degli altri vengono rifiutate in silenzio (il dispositivo le toglie dalla coda e resta disallineato). Soluzione: in `push_items` limitare `updated_at` a `now() + 5 minuti`; avviso se l'orologio differisce dal server.
- **Impostazioni in una sola voce** — `settings`: obiettivo, soglie e fasce muscolari modificate su due dispositivi si sovrascrivono a vicenda. Soluzione: voci separate o unione per campo.
- **Confronto a ogni salvataggio** — `dexieStore.ts:193-201`: `JSON.stringify` di tutte le voci (1500 sedute = decine di ms sul telefono). Soluzione: confronto per riferimento (con B1).
- **Backup** — `dexieStore.ts:282-290, 711-723`: avvio e pagina Dati leggono tutti i backup interi (lento con anni di dati); un solo limite di 8 tra automatici e di sicurezza (qualche ripristino fa sparire i backup vecchi). Soluzione: leggere solo i metadati; 4 automatici + 4 di sicurezza.
- **Cache FIT del dispositivo** — `fitFiles`: cresce senza limite e in chiaro (centinaia di MB in 2 anni); `markFitUploaded` può ricreare una riga vuota se il file viene archiviato durante il caricamento (`dexieStore.ts:545-554`); `uploadPending` si ferma al primo file in errore (`fitStorage.ts:44-47`). Soluzione: cache compressa o con limite, saltare il file in errore.
- **Importa e Ripristina** — `DataPage.tsx`, testi `data.confirmReplace` e `confirmRestore`: con l'account sostituiscono i dati anche sul server e sugli altri dispositivi, ma il testo non lo dice; dopo l'operazione le altre parti aperte non si ricaricano (`refreshData`).
- **Ricarica il server** — `account.ts:221-232`: gli altri dispositivi tengono le voci che il server non ha più; le ore "adesso" vincono sulle loro modifiche recenti. Soluzione: testo "usalo dal dispositivo più aggiornato" e riconciliazione completa.
- **Riconciliazione completa** per i dispositivi fermi da molto (serve per poter riattivare la pulizia di B5).
- **Cambio di account** — `startAccount`: dati e coda locali finiscono nell'account nuovo (da gestire prima del multi-utente).
- **Più schede aperte**: nessun aggiornamento reciproco (dopo B1 senza perdite, ma con viste vecchie). Soluzione: `BroadcastChannel`.
- **Validazione superficiale** — `validate.ts`: eseguito, giri e campi annidati non controllati. Soluzione: controlli più profondi sulle voci in arrivo.
- **Proprie modifiche riscaricate** a ogni sincronizzazione (traffico doppio).

### Garmin

- **Attività senza file originale** — `intervals.ts:31`, `sync.ts:186-189`: 401/403/404 sul file di una singola attività diventano "chiave sbagliata" e fermano anche le altre attività da collegare. Soluzione: errore per attività, continuare con le altre.
- **Stessa attività da due dispositivi** prima della sincronizzazione → due sedute non pianificate. Soluzione: id della seduta ricavato dall'attività (`applyImport` accetta già `newSessionId`).
- **Giorno dell'attività** — `garminImport.ts:26`: calcolato con il fuso del dispositivo che importa, non con quello dell'attività (viaggi, gare all'estero vicino a mezzanotte). Soluzione: ora locale del FIT o `start_date_local` di intervals.icu.
- **FIT troncati** (orologio spento a metà, senza riepilogo) rifiutati come non validi. Soluzione: ricostruire la frazione dai campioni.
- **Pagina Attività**: lettura del FIT sul thread principale (attività lunghe: 1–3 s di blocco). Soluzione: Web Worker.
- **Nessun timeout** verso intervals.icu: con rete pessima il pulsante resta in attesa a lungo.

### Allenamento live

- **Allenamento dimenticato aperto**: la durata va fino a Termina (anche il giorno dopo) e falsa carico e Panoramica, senza modo di correggerla. Soluzione: oltre qualche ora proporre come fine l'ultima serie, o ora di fine modificabile.
- **Valori "ultima volta" ricalcolati ogni secondo** per ogni serie (`LiveExerciseCard.tsx:104` + `useNow(1000)`: scansione e ordinamento di tutto lo storico). Soluzione: calcolo una volta per esercizio, orologio in un componente a parte.
- **Permesso notifiche negato**: nessun avviso; il rifiuto resta valido fino al riavvio dell'app (`restAlert.ts:16-33`).
- **Tasto Indietro di Android** con una finestra aperta (riepilogo, registra eseguito): torna alla pagina precedente e si perdono i campi.

### Calcoli

- Nessun errore trovato: date sempre locali, ora legale e fine anno corretti, divisioni per zero gestite (ACWR e Freschezza `null`, settimane minimo 1).
- Prestazioni: `dayStatus` filtra tutte le sedute per ogni giorno nelle viste Mese e Anno. Soluzione: mappa per data.

### Android e PWA

- **Aggiornamento automatico della PWA** (`registerType: 'autoUpdate'`): dopo un deploy la pagina si ricarica pochi secondi dopo l'apertura e si perde un modulo appena iniziato. Soluzione: avviso "Aggiorna" o ricarica rimandata.
- **Font da Google** a ogni avvio (`index.html`): l'APK offline usa i font di sistema (impaginazione diversa); privacy. Soluzione: font nel progetto.
- **Bundle principale ~1 MB** (`dist/assets/index-*.js`): le pagine non si caricano su richiesta. Soluzione: lazy loading di Analisi, Forger, Piano, Dati.
- **Barre di sistema**: targetSdk 36 (bordo a bordo) e `viewport-fit=cover` assente: da verificare sul telefono che intestazione e barra del recupero non finiscano sotto le barre.
- **`android:allowBackup="true"`**: sessione e chiave intervals.icu possono finire nel backup Google del telefono. Da valutare.
- **Workflow APK** (`.github/workflows/android-apk.yml`): azione di terzi (`softprops/action-gh-release`) non fissata a uno SHA; keystore lasciato nella cartella temporanea durante la pubblicazione; nessun lint/test prima della build; il `versionCode` è il numero del run: **non rinominare mai il workflow** (ripartirebbe da 1 e Android rifiuterebbe l'aggiornamento).
- **`android/.gitignore`**: le righe che escludono i keystore sono commentate (aggiungere anche `*.p12`).
- `theme-color` fisso (rosso del tema chiaro) anche col tema scuro.

### Sicurezza

- **`npm audit`**: 10 vulnerabilità moderate, tutte in strumenti di sviluppo (typescript-eslint → minimatch; vite-plugin-pwa → workbox-build → glob). Nessun impatto sull'app pubblicata. Aggiornare typescript-eslint; per workbox attendere una versione corretta.
- **Nessuna CSP né header di sicurezza** su Vercel. Soluzione: `vercel.json` con CSP (Supabase, intervals.icu, GitHub API, tessere OSM, Google Fonts finché servono).

### UI e codice

- **Testi di accesso** pensati per il link ("Inviami il link", "apri il link da questo stesso browser"): nell'APK funziona solo il codice.
- **Esercizi di base** solo in italiano anche per chi usa l'inglese.
- **Modali senza focus trap** (con Tab si esce dalla finestra).
- **Stato "dati più recenti sul server"**: l'avviso "aggiorna l'app" si vede solo nella pagina Dati e nell'icona.
- **Soglie Garmin**: dati arrivati mentre si scrive azzerano i campi del modulo.
- **Test mancanti**: `account.ts`, `supabaseRemote.ts`, `fitStorage.ts`, hook che salvano, FIT troncati e nuoto in vasca.
- Dalla roadmap precedente: rifinitura grafica; confronto con il periodo precedente in Analisi.

## Controllato e a posto

- **Supabase:** RLS su `items` e sul bucket `fit` (solo righe e cartella proprie), `grant` espliciti, `anon` senza righe visibili, `push_items` con "vince la più recente" lato server, funzioni `security invoker` con `search_path` vuoto e permessi tolti a `anon`.
- **Segreti:** nessuna chiave nel repository né nella cronologia; `.env.local` ignorato; chiave di firma solo nei segreti di GitHub e fuori dal repo; chiave di intervals.icu solo sul dispositivo (non in export, backup né sincronizzazione).
- **Codice sicuro:** nessun `dangerouslySetInnerHTML`, `innerHTML` o `eval`; testi dell'utente sempre mostrati da React.
- **Testi IT/EN:** `en.ts` è tipizzato come `Dictionary` di `it.ts`, quindi una chiave mancante non compila; testi fissi solo per sigle (RIR, SWOLF, mm:ss).
- **Colori:** nessun colore fuori dal tema (solo valori di riserva in `ActivityMap.tsx`).
- **Date e calcoli:** `toIsoDate`/`parseIsoDate`/`addDays` locali, `daysBetween` arrotondato (ora legale), settimane da lunedì, fine anno; carico, ACWR, Freschezza, recupero e volume con casi vuoti gestiti.
- **Migrazioni:** dalla 0 alla 10 con test, numerazione senza buchi, file di versioni più recenti rifiutati all'import, migrazioni pure e tolleranti ai dati malformati.
- **Live:** timer e recupero dai timestamp (giusti dopo il background), virgola decimale accettata, kg 0–1000 e reps 1–999, ripresa dalla bozza o dal piano, notifica annullata a fine o annullamento, wake lock richiesto di nuovo al ritorno in primo piano.
- **FIT:** errori dell'SDK catturati, zip e gzip, multisport con transizioni e distanza per frazione, vasche e SWOLF, campi mancanti, analisi con casi limite (meno di 2 campioni, meno di 30 s di potenza).
- **Android:** permesso delle notifiche (Android 13+) richiesto, allarme esatto, notifiche ripristinate dopo il riavvio; nessun traffico in chiaro.
- **Keep-alive:** ogni 3 giorni; la guida avvisa già che GitHub disattiva i workflow dopo 60 giorni senza commit.

## Verifiche manuali (non automatizzabili qui)

Da fare con la checklist di release: layout a 390 px e 1440 px nelle pagine principali; sul telefono barre di sistema, notifica del recupero a schermo spento, Collega Garmin, sincronizzazione telefono ↔ PC, export dal PC.
