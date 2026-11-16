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

Comuni a tutte le discipline: `id`, `name`, `discipline`, `notes` facoltative, `estimatedDurationSec` facoltativa (**inserita a mano, mai calcolata**), `archived` (si archivia, non si cancella in massa), `createdAt`/`updatedAt`. `WorkoutTemplate` è un'unione discriminata su `discipline`: ogni nuova disciplina aggiunge il proprio tipo con il proprio contenuto.

- **Forza** (`StrengthTemplate`): lista ordinata di voci (`entries`). Ogni voce: `exerciseId`, `restSeconds` (default quello dell'esercizio), `notes` facoltative, `supersetId` facoltativo e le serie `sets` (`reps`, `kg`, `rir`).
  - **Superserie**: voci **consecutive** con lo stesso `supersetId` (almeno due). Il recupero che conta è quello dell'ultima voce del giro. Nel riordino il gruppo si muove unito; le etichette "Superserie A/B…" si calcolano dall'ordine.
- **Corsa**, **Bici**, **Nuoto**: da aggiungere (distanza e passo / intervalli / velocità media).

Le sedute continuano ad avere la propria **copia del piano** (`Plan`): modificare un template non le tocca. Salvataggio dei template in `DataStore` (`loadTemplates`/`saveTemplates`).

## Seduta

Un allenamento in una data: `date`, `order` nel giorno, `status` (`planned`, `in_progress`, `done`, `skipped`), `templateId` facoltativo e **copia del piano**: modificare il template non cambia le sedute esistenti.

## Forza dal vivo

Inizio e fine; esercizi effettivi in ordine (si possono aggiungere, saltare, riordinare rispetto al piano); per ogni serie kg, ripetizioni, RIR, ora di completamento. Valori proposti per una serie: quelli dell'ultima volta per lo stesso esercizio, se esistono, altrimenti quelli previsti. Il timer di recupero è solo a schermo, non salvato.

## Endurance effettivo

Manuale o importato da `.FIT` Garmin (solo Garmin → app), campo `source` (`manual` | `garmin_fit`): distanza, durata, passo o velocità medi, FC media e massima, dislivello, giri. L'import abbina il file alla seduta prevista dello stesso giorno e disciplina, altrimenti ne crea una nuova.

## Calcoli (`src/lib/`)

- Durata stimata endurance (`endurance.ts`).
- Volume = kg × ripetizioni (`strength.ts`).
- PR per esercizio: kg massimo e miglior serie per volume, solo sedute `done`.
- Serie per muscolo = serie completate × percentuale / 100 (mappa di calore); esercizi saltati esclusi.
