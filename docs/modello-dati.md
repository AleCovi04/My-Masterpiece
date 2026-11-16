# Modello dati

Tipi in `src/data/types.ts`, salvataggio in `src/data/`, calcoli in `src/lib/`.

## Unità

- Tempi in **secondi**, distanze in **metri**, pesi in **kg**.
- Date `YYYY-MM-DD`; timestamp ISO 8601 completi.
- Passo corsa in s/km, passo nuoto in s/100 m, velocità bici in km/h.
- Ogni entità ha `id`, `createdAt`, `updatedAt` (per la sincronizzazione futura).

## Muscoli

Elenco fisso di 20 gruppi, con etichetta IT/EN, definito **solo** in `src/components/body/groups.ts` (la mappa del corpo e il modello dati usano la stessa fonte): deltoide anteriore/laterale/posteriore, bicipite, tricipite, avambracci, pettorale alto, pettorale, addominali, obliqui, dorsali, schiena media, trapezio alto, lombari, quadricipiti, adduttori, abduttori, glutei, femorali, polpacci.

Muscolo **principale** di un esercizio: quello con la % più alta (a pari merito lo sono tutti); gli altri sono secondari.

Migrazione: i dati salvati prima dei 20 gruppi vengono convertiti dalla migrazione v1 (vedi "Migrazioni"; la conversione è in `src/lib/muscleMigration.ts`).

## Esercizio (solo forza)

Nome, muscoli con coinvolgimento 1–100 % (es. panca: petto 100, deltoidi anteriori 60, tricipiti 40), recupero predefinito 165 s, note facoltative, `archived`. Gli esercizi non si cancellano: si archiviano. Dal vivo si registrano kg × ripetizioni; il RIR è solo un obiettivo del piano.

## Template (allenamento salvato)

Comuni a tutte le discipline: `id`, `name`, `discipline`, `notes` facoltative, `estimatedDurationSec` (forza: **inserita a mano, mai calcolata e obbligatoria**: l'editor non salva un template di forza senza; corsa/bici/nuoto: facoltativa, presente solo se l'utente sovrascrive la durata calcolata), `archived` (si archivia, non si cancella in massa), `createdAt`/`updatedAt`. `WorkoutTemplate` è un'unione discriminata su `discipline`: ogni nuova disciplina aggiunge il proprio tipo con il proprio contenuto.

- **Forza** (`StrengthTemplate`): lista ordinata di voci (`entries`). Ogni voce: `exerciseId`, `restSeconds` (default quello dell'esercizio), `notes` facoltative, `supersetId` facoltativo e le serie `sets`.
  - **Serie prevista** (`TemplateSet`): solo `reps` obiettivo (≥ 1) e `rir` obiettivo (0–10), entrambi facoltativi. **Niente kg**: il carico non si pianifica, si registra dal vivo. Un campo lasciato vuoto resta assente nel dato (mai `0`).
  - **Scorciatoia** dell'editor: "N × reps, RIR" + "Genera serie" crea N serie uguali (`expandSets`); chiede conferma se le righe erano state modificate a mano.
  - **Superserie**: voci **consecutive** con lo stesso `supersetId` (almeno due). Il recupero che conta è quello dell'ultima voce del giro. Nel riordino il gruppo si muove unito; le etichette "Superserie A/B…" si calcolano dall'ordine.
- **Corsa**, **Bici**, **Nuoto** (`RunTemplate`, `BikeTemplate`, `SwimTemplate`): stessa struttura, con `mode`:
  - **Intensità** (`intensity`, sempre facoltativa): corsa = passo in **s/km**, nuoto = passo in **s/100 m**, bici = velocità in **km/h**. Distanze in metri, tempi in secondi.
  - `mode: 'simple'` → `simple`: `goal` (`distance` | `time`), il valore dell'obiettivo (`distanceM` o `durationS`) e l'`intensity`. Il campo complementare **non si salva**: si calcola (distanza = tempo × velocità, tempo = distanza / velocità) e solo se c'è l'intensità.
  - `mode: 'structured'` → `items`: lista ordinata di **passi** e **blocchi**.
    - Passo (`EnduranceStep`): `type` (`warmup` | `work` | `recovery` | `cooldown`), una durata a distanza (`distanceM`) **oppure** a tempo (`durationS`), `intensity` facoltativa, `notes` facoltative.
    - Blocco (`RepeatBlock`, "Ripeti N volte"): `times` (2–99) e `steps`. Contiene solo passi, mai altri blocchi; un blocco senza passi sparisce. I passi si possono anche usare singoli, fuori dai blocchi.
  - **Totali** (`src/lib/enduranceTemplate.ts`): ogni passo vale per la parte calcolabile (distanza e intensità → tempo; tempo e intensità → distanza); un passo senza intensità conta solo per il dato che ha, e il totale è indicato come parziale ("≥"). I blocchi contano N volte.
  - **Durata mostrata**: `estimatedDurationSec` se presente, altrimenti il tempo totale calcolato (può mancare se nessun passo ha l'intensità). "Ripristina automatico" toglie la sovrascrittura.
  - **Riassunto in lista**: es. `Risc. 15′ · 6×400 m · Def. 10′` (nel blocco compaiono i passi di lavoro).

Salvataggio dei template in `DataStore` (`loadTemplates`/`saveTemplates`), vedi "Salvataggio".

## Seduta (sessione del Calendario)

Un allenamento in una data: `id`, `date`, `order` nel giorno (da 0), `discipline`, `status` (`planned`, `in_progress`, `done`, `skipped`), `templateId` facoltativo, `plan` e `estimatedDurationSec` facoltativa. `Session` è un'unione discriminata su `discipline` (`StrengthSession` | `EnduranceSession`), come i template.

- **`plan` è una copia** con la stessa struttura del template: forza = `entries` (voci, serie con reps e RIR obiettivo, superserie); corsa/bici/nuoto = `mode` + `simple` oppure `items` (passi e blocchi). La copia rende la seduta indipendente: modificarla non tocca il template e modificare (o eliminare) il template non cambia le sedute già pianificate.
- **`name`** (facoltativo) è il nome copiato dal template al momento dell'inserimento; se manca (sessione vuota) si mostra la disciplina. Anche `notes` viene copiato.
- **Durata stimata**: stessa regola dei template: `estimatedDurationSec` se presente, altrimenti per l'endurance il tempo calcolato dal piano; per la forza senza durata scritta a mano non è nota (nelle statistiche conta zero).
- **Sessione vuota**: nessun `templateId`; forza con `entries` vuote, endurance in modalità semplice senza obiettivo.
- **`actual`** (l'eseguito) è solo predisposto come tipo: `StrengthActual` / `EnduranceActual`, descritti sotto. Non c'è ancora nulla che lo scriva. Nel piano di una seduta la durata stimata resta facoltativa (una sessione vuota non ce l'ha).
- **Operazioni** (`src/lib/sessions.ts`): creazione da template o vuota, inserimento in una posizione esatta del giorno, spostamento (`src/lib/reorder.ts`), duplicazione (copia programmata, subito dopo l'originale), salta/ripristina, eliminazione. Ogni operazione rinumera `order` nei giorni coinvolti.
- **Modifica piano**: usa gli stessi editor dei template, applicati alla sola seduta (`sessionAsTemplate` / `applyEditedPlan`).
- **Salvataggio** in `DataStore` (`loadSessions`/`saveSessions`). Non ci sono sedute dimostrative: l'elenco parte vuoto. Le sedute del vecchio formato dimostrativo vengono scartate quando si migra da localStorage (restano nella copia di backup delle chiavi vecchie).

## Forza dal vivo (da fare: il modello è già pronto)

La registrazione in palestra non è ancora implementata; i tipi (`StrengthActual`, `ActualExercise`, `ActualSet`) sono già compatibili con questo disegno:

- Inizio e fine; esercizi effettivi in ordine (si possono aggiungere, saltare, riordinare rispetto al piano).
- **Ogni serie ha due campi da compilare: kg e ripetizioni** (`ActualSet`: `kg`, `reps`, `completedAt`). La serie n dell'eseguito corrisponde alla serie n del piano.
- **In grigio, come suggerimento**, i valori dell'**ultima volta** in cui quell'esercizio è stato fatto: stessa serie (stesso numero d'ordine), in qualsiasi allenamento. Li calcola `previousSet(exerciseId, setIndex, sessions)` in `src/lib/strength.ts`: guarda le sedute `done` dalla più recente e prende la prima in cui l'esercizio ha quella serie. Non si salvano: si ricalcolano.
- Accanto, l'**obiettivo di ripetizioni** del piano (`plan.entries[].sets[n].reps`, copiato dal template).
- Il **RIR non è un campo**: è solo un'indicazione letta dal piano (`sets[n].rir`). Per questo `ActualSet` non ha `rir` e `TemplateSet` non ha `kg`.
- Il timer di recupero è solo a schermo, non salvato.

## Endurance effettivo

Manuale o importato da `.FIT` Garmin (solo Garmin → app), campo `source` (`manual` | `garmin_fit`): distanza, durata, passo o velocità medi, FC media e massima, dislivello, giri. L'import abbina il file alla seduta prevista dello stesso giorno e disciplina, altrimenti ne crea una nuova.

## Salvataggio (`src/data/`)

- **IndexedDB tramite Dexie** (`dexieStore.ts`), database `my-masterpiece`. L'app usa solo l'interfaccia `DataStore` (`store.ts`), esportata come `dataStore` da `src/data/index.ts`: è l'**unico punto di accesso** ai dati, ed è lì che si aggancerà la sincronizzazione con Supabase. Nessun altro modulo tocca IndexedDB.
- Tabelle: `exercises`, `templates`, `sessions` (una riga per entità: `id`, `pos` = posizione nell'elenco, `item` = l'entità), `meta` (`schemaVersion`, `raceDate`, `lastExportAt`, `legacyImportedAt`), `backups`.
- **localStorage** resta solo per le preferenze leggere del dispositivo (`src/lib/preferences.ts`: tema, lingua, scheda del Planner, sidebar).
- **Primo avvio**: se IndexedDB è vuoto e ci sono dati nel vecchio localStorage (`mm.sessions`, `mm.exercises`, `mm.templates`, `mm.raceDate`), vengono migrati in automatico (`legacyLocalStorage.ts`). Le chiavi vecchie non si perdono: diventano copie di backup `<chiave>.backup-idb` (es. `mm.templates.backup-idb`). Se un giorno IndexedDB venisse svuotato, si riparte da quelle copie.
- **Persistenza**: all'avvio si chiama `navigator.storage.persist()`, così il browser non cancella i dati quando lo spazio scarseggia. Lo stato si vede nella pagina Dati.
- Se IndexedDB non è disponibile l'app parte comunque, con i dati solo in memoria per quella sessione.

## Migrazioni (`src/data/migrations.ts`)

I dati hanno un **numero di versione dello schema** (`SCHEMA_VERSION`, salvato in `meta.schemaVersion`, scritto in ogni export e in ogni backup). `MIGRATIONS` è l'elenco ordinato dei passaggi: la migrazione con `to: N` porta i dati dalla versione N−1 alla N. All'avvio, se la versione salvata è più bassa, si salva un backup (`pre-migration`) e si eseguono in ordine le migrazioni mancanti; le stesse migrazioni si applicano ai file importati e ai backup ripristinati.

| Versione | Cosa cambia                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| 0        | Formato iniziale (15 gruppi muscolari, serie con i kg)                                                        |
| 1        | Muscoli nei 20 gruppi della mappa del corpo                                                                   |
| 2        | Serie previste solo con `reps` e `rir` obiettivo (via i `kg` da template e piani); serie eseguite senza `rir` |

**Come aggiungere una migrazione**

1. Cambia i tipi in `src/data/types.ts` (e, se serve, i controlli in `src/data/validate.ts`).
2. In `src/data/migrations.ts` aggiungi **in fondo** a `MIGRATIONS` una voce con `to` = ultima versione + 1, una `description` e la funzione `migrate`. `SCHEMA_VERSION` si aggiorna da solo.
3. `migrate` è una **funzione pura** su `RawData` (`exercises`, `templates`, `sessions`, `raceDate`): riceve dati della versione precedente (tipo `unknown`, perché la forma è quella vecchia), non deve modificarli sul posto e non deve fallire su elementi malformati (li lascia come sono: li scarta poi `sanitize`).
4. Aggiungi un test in `src/data/migrations.test.ts` con un esempio di dati vecchi e il risultato atteso.
5. Aggiungi una riga alla tabella qui sopra.

Regole: **mai modificare o togliere una migrazione già pubblicata** (i dispositivi e i file vecchi devono poter rifare tutto il percorso); i numeri sono consecutivi, senza buchi (c'è un test). La `version(...)` di Dexie in `dexieStore.ts` è un'altra cosa: riguarda solo tabelle e indici, e cambia solo se cambiano quelli.

## Export, import e backup (pagina Dati)

- **Esporta tutto**: un file JSON `my-masterpiece-AAAA-MM-GG.json` con `app`, `schemaVersion`, `exportedAt` e `data` (`AppData`: esercizi, template, sedute, data gara). La data dell'ultimo export manuale è in `meta.lastExportAt`; dopo 30 giorni la pagina mostra un promemoria.
- **Importa** (`parseImportFile` in `exportFile.ts`): controlla che sia un export dell'app, rifiuta i file di una versione più recente, applica le migrazioni se è vecchio, scarta gli elementi non validi e mostra un'anteprima (quanti esercizi, template e sessioni). Solo dopo la conferma sostituisce **tutti** i dati; prima salva un backup (`pre-import`).
- **Backup automatici**: all'avvio, se l'ultimo backup automatico ha più di 7 giorni (o non c'è), si salva uno snapshot completo in IndexedDB. Si tengono gli ultimi 8 backup in tutto (automatici e di sicurezza: `pre-import`, `pre-restore`, `pre-migration`), ripristinabili dalla pagina Dati; il ripristino salva prima i dati attuali. I backup stanno sullo stesso dispositivo: proteggono dagli errori, non dalla perdita del dispositivo. Per quello serve l'export.

## Calcoli (`src/lib/`)

- Totali, durata e riassunto dei piani endurance, di template e sedute (`enduranceTemplate.ts`); durata e operazioni sulle sedute (`sessions.ts`).
- Volume = kg × ripetizioni (`strength.ts`).
- PR per esercizio: kg massimo e miglior serie per volume, solo sedute `done`.
- Ultima volta per esercizio e serie (`previousSet`), per i valori in grigio della forza dal vivo.
- Serie per muscolo = serie completate × percentuale / 100 (mappa di calore); esercizi saltati esclusi.
