# Modello dati

Tipi in `src/data/types.ts`, calcoli in `src/lib/`.

## Unità

- Tempi in **secondi**, distanze in **metri**, pesi in **kg**.
- Date `YYYY-MM-DD`; timestamp ISO 8601 completi.
- Passo corsa in s/km, passo nuoto in s/100 m, velocità bici in km/h.
- Ogni entità ha `id`, `createdAt`, `updatedAt` (per la sincronizzazione futura).

## Muscoli

Elenco fisso di 15 gruppi, con etichetta IT/EN: petto, deltoidi anteriori/laterali/posteriori, bicipiti, tricipiti, avambracci, addominali, dorsali, schiena media (trapezio/romboidi), lombari, glutei, quadricipiti, femorali, polpacci.

## Esercizio (solo forza)

Nome, muscoli con coinvolgimento 1–100 % (es. panca: petto 100, deltoidi anteriori 60, tricipiti 40), recupero predefinito 165 s, note facoltative, `archived`. Gli esercizi non si cancellano: si archiviano. Si registra sempre kg × ripetizioni + RIR.

## Template (allenamento salvato)

Nome + piano, per disciplina:

- **Forza**: esercizi in ordine; per ognuno serie previste (ripetizioni, kg, RIR obiettivo) e recupero (default quello dell'esercizio).
- **Corsa**: distanza e passo, oppure intervalli (distanza, passo, recupero camminato in s).
- **Bici**: distanza e velocità media.
- **Nuoto**: distanza e passo.

La durata stimata dell'endurance è calcolata, non salvata.

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
