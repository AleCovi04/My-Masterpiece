# Garmin: import e sincronizzazione

Le attività di corsa, bici e nuoto dell'orologio entrano nell'app in due modi: caricando i file `.FIT`/`.zip` oppure con "Sincronizza Garmin" tramite intervals.icu. Le sedute importate hanno la pagina **Attività** (mappa, grafici, parziali, zone).

## 1. Supabase: spazio per i file (una volta)

I file FIT originali vanno in un bucket privato `fit`. Lo crea lo schema, che va rieseguito **prima** del primo import (altrimenti la sincronizzazione delle attività importate non riesce):

1. Supabase → **SQL Editor** → **New query**.
2. Incolla tutto [`supabase/schema.sql`](../supabase/schema.sql) → **Run**. Non cancella dati.
3. Controllo: **Storage** → deve esserci il bucket `fit` (privato).

## 2. intervals.icu (una volta, facoltativo ma consigliato)

1. Vai su [intervals.icu](https://intervals.icu) → crea un account gratuito.
2. **Settings** → **Connections** → **Garmin Connect** → **Connect** e autorizza. Da quel momento le nuove attività di Garmin arrivano su intervals.icu da sole (le vecchie si possono chiedere dalla stessa pagina).
3. **Settings** → in fondo **Developer Settings**: copia l'**Athlete ID** (inizia con `i`) e genera/copia la **API Key**.
4. Nell'app: **Dati** → **Garmin tramite intervals.icu** → incolla ID e chiave → **Collega**.
   ID e chiave restano solo su quel dispositivo: ripeti il passo sul telefono e sul PC.

Poi: **Calendario** → **Sincronizza Garmin**. L'app controlla da sola anche all'apertura (al massimo una volta all'ora). La prima volta prende gli ultimi 30 giorni.

## 3. Importare i file a mano

- Garmin Connect (sito) → apri l'attività → ⚙ → **Esporta originale** → si scarica uno `.zip`.
- Nell'app: dettaglio della seduta → **Importa .FIT** (va su quella seduta), oppure **Dati** → **Importa file Garmin** (anche più file; ogni attività va nella seduta dello stesso giorno e sport).

## Come vengono abbinate

- Stesso giorno e stesso sport (un multisport: un brick con le stesse frazioni). Se le sedute adatte sono più d'una l'app chiede quale; se non ce n'è nessuna crea una seduta "non pianificata" già svolta.
- L'RPE non arriva dall'orologio: aggiungilo dal dettaglio della seduta.
- Un'attività già importata non si importa di nuovo, nemmeno se cancelli la seduta.

## Zone

**Dati** → **Soglie per le zone**: FC massima, FC a riposo (facoltativa) e FTP. Senza, la pagina Attività usa le zone salvate dall'orologio.

## App Android

Questa versione cambia lo schema dei dati (v10): dopo l'aggiornamento del sito, l'APK vecchio mostra "aggiorna l'app per sincronizzare". Rilancia il workflow **Android APK** e installa il nuovo APK (vedi [android.md](android.md)).
