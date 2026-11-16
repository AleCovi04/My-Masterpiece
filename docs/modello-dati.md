# Modello dati

Tipi in `src/data/types.ts`, calcoli in `src/lib/`.

## Unità

- Tempi in **secondi**, distanze in **metri**, pesi in **kg**.
- Date `YYYY-MM-DD`; timestamp ISO 8601 completi.
- Passo corsa in s/km, passo nuoto in s/100 m, velocità bici in km/h.
- Ogni entità ha `id`, `createdAt`, `updatedAt` (per la sincronizzazione futura).

## Muscoli

Elenco fisso di 20 gruppi, con etichetta IT/EN, definito **solo** in `src/components/body/groups.ts` (la mappa del corpo e il modello dati usano la stessa fonte): deltoide anteriore/laterale/posteriore, bicipite, tricipite, avambracci, pettorale alto, pettorale, addominali, obliqui, dorsali, schiena media, trapezio alto, lombari, quadricipiti, adduttori, abduttori, glutei, femorali, polpacci.

Muscolo **principale** di un esercizio: quello con la % più alta (a pari merito lo sono tutti); gli altri sono secondari.

Migrazione: i dati salvati prima dei 20 gruppi vengono convertiti una sola volta al primo caricamento (`src/lib/muscleMigration.ts`, flag `mm.migrations.muscles20`), con copia di sicurezza in `mm.exercises.backup-v1`.

## Esercizio (solo forza)

Nome, muscoli con coinvolgimento 1–100 % (es. panca: petto 100, deltoidi anteriori 60, tricipiti 40), recupero predefinito 165 s, note facoltative, `archived`. Gli esercizi non si cancellano: si archiviano. Si registra sempre kg × ripetizioni + RIR.

## Template (allenamento salvato)

Comuni a tutte le discipline: `id`, `name`, `discipline`, `notes` facoltative, `estimatedDurationSec` facoltativa (forza: **inserita a mano, mai calcolata**; corsa/bici/nuoto: presente solo se l'utente sovrascrive la durata calcolata), `archived` (si archivia, non si cancella in massa), `createdAt`/`updatedAt`. `WorkoutTemplate` è un'unione discriminata su `discipline`: ogni nuova disciplina aggiunge il proprio tipo con il proprio contenuto.

- **Forza** (`StrengthTemplate`): lista ordinata di voci (`entries`). Ogni voce: `exerciseId`, `restSeconds` (default quello dell'esercizio), `notes` facoltative, `supersetId` facoltativo e le serie `sets` (`reps`, `kg`, `rir`).
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

Salvataggio dei template in `DataStore` (`loadTemplates`/`saveTemplates`).

## Seduta (sessione del Calendario)

Un allenamento in una data: `id`, `date`, `order` nel giorno (da 0), `discipline`, `status` (`planned`, `in_progress`, `done`, `skipped`), `templateId` facoltativo, `plan` e `estimatedDurationSec` facoltativa. `Session` è un'unione discriminata su `discipline` (`StrengthSession` | `EnduranceSession`), come i template.

- **`plan` è una copia** con la stessa struttura del template: forza = `entries` (voci, serie, superserie); corsa/bici/nuoto = `mode` + `simple` oppure `items` (passi e blocchi). La copia rende la seduta indipendente: modificarla non tocca il template e modificare (o eliminare) il template non cambia le sedute già pianificate.
- **`name`** (facoltativo) è il nome copiato dal template al momento dell'inserimento; se manca (sessione vuota) si mostra la disciplina. Anche `notes` viene copiato.
- **Durata stimata**: stessa regola dei template: `estimatedDurationSec` se presente, altrimenti per l'endurance il tempo calcolato dal piano; per la forza senza durata scritta a mano non è nota (nelle statistiche conta zero).
- **Sessione vuota**: nessun `templateId`; forza con `entries` vuote, endurance in modalità semplice senza obiettivo.
- **`actual`** (l'eseguito) è solo predisposto come tipo: `StrengthActual` / `EnduranceActual`, descritti sotto. Non c'è ancora nulla che lo scriva.
- **Operazioni** (`src/lib/sessions.ts`): creazione da template o vuota, inserimento in una posizione esatta del giorno, spostamento (`src/lib/reorder.ts`), duplicazione (copia programmata, subito dopo l'originale), salta/ripristina, eliminazione. Ogni operazione rinumera `order` nei giorni coinvolti.
- **Modifica piano**: usa gli stessi editor dei template, applicati alla sola seduta (`sessionAsTemplate` / `applyEditedPlan`).
- **Salvataggio** in `DataStore` (`loadSessions`/`saveSessions`, chiave `mm.sessions`). Non ci sono più sedute dimostrative: l'elenco parte vuoto. Le sedute salvate nel formato precedente (solo dati dimostrativi) vengono scartate al primo caricamento, con copia di sicurezza in `mm.sessions.backup-v1`.

## Forza dal vivo

Inizio e fine; esercizi effettivi in ordine (si possono aggiungere, saltare, riordinare rispetto al piano); per ogni serie kg, ripetizioni, RIR, ora di completamento. Valori proposti per una serie: quelli dell'ultima volta per lo stesso esercizio, se esistono, altrimenti quelli previsti. Il timer di recupero è solo a schermo, non salvato.

## Endurance effettivo

Manuale o importato da `.FIT` Garmin (solo Garmin → app), campo `source` (`manual` | `garmin_fit`): distanza, durata, passo o velocità medi, FC media e massima, dislivello, giri. L'import abbina il file alla seduta prevista dello stesso giorno e disciplina, altrimenti ne crea una nuova.

## Calcoli (`src/lib/`)

- Totali, durata e riassunto dei piani endurance, di template e sedute (`enduranceTemplate.ts`); durata e operazioni sulle sedute (`sessions.ts`).
- Volume = kg × ripetizioni (`strength.ts`).
- PR per esercizio: kg massimo e miglior serie per volume, solo sedute `done`.
- Serie per muscolo = serie completate × percentuale / 100 (mappa di calore); esercizi saltati esclusi.
