# Spazio dei dati su Supabase

Cosa fare se lo spazio sul server cresce, e come ripartire da zero. Oggi lo spazio basta per anni; gli strumenti sono già nell'app (**Dati**), questo documento dice quando usarli.

## Gli spazi e i limiti

Piano gratuito di Supabase, limiti **del progetto** (con più utenti si dividono):

| Spazio       | Cosa contiene                                                                                                 | Limite | Consumo stimato (un utente) | Dura circa    |
| ------------ | ------------------------------------------------------------------------------------------------------------- | ------ | --------------------------- | ------------- |
| **Database** | Tutti i dati dell'app (tabella `items`): sedute, eseguiti, esercizi, allenamenti, blocchi, fasi, impostazioni | 500 MB | 5–10 MB all'anno            | oltre 40 anni |
| **Storage**  | File FIT originali di Garmin (bucket `fit`), compressi con gzip                                               | 1 GB   | 40–80 MB all'anno           | oltre 12 anni |

Dove vederlo:

- **Nell'app:** **Dati** → **Spazio sul server** (con l'account collegato). I dati sono una stima (il doppio del JSON di export); i file Garmin sono il valore vero del server. Barre verdi sotto il 50 %, gialle fino all'80 %, rosse oltre.
- **Su Supabase:** **Organization** → **Usage** (valori esatti di tutto il progetto). Il database parte già da qualche decina di MB occupati dalle tabelle interne di Supabase: è normale.

## Cosa non fare mai

- **Cancellare righe dalla tabella `items`** dalla dashboard di Supabase: telefono e PC non se ne accorgono e non le rimandano; un dispositivo nuovo non le riceverà più. Se è successo: [Recupero](#recupero).
- **Cancellare file dal bucket `fit`** a mano: usa **Libera spazio** (livello 2), che prima ti fa scaricare lo .zip.
- **Contare sul JSON di export per i file FIT:** l'export contiene tutti i dati ma **non** i FIT originali.

Per avere una copia tua basta l'export mensile (**Dati** → **Esporta tutto (JSON)**), salvato fuori dal telefono.

## I livelli

| Livello | Quando                | Cosa                                                   | Si perde qualcosa?                                | Stato                                                             |
| ------- | --------------------- | ------------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------- |
| 0       | Sempre                | Controllo mensile ed export; FIT caricati compressi    | No                                                | ✅ attivo                                                         |
| 1       | —                     | Ricomprimere i FIT vecchi                              | No                                                | non serve: dopo la ripartenza del 2026 tutti i FIT sono compressi |
| 2       | Storage oltre l'80 %  | **Libera spazio**: archivia i FIT più vecchi di N anni | Mappa e grafici di quelle attività (recuperabili) | ✅ in **Dati → Spazio sul server**                                |
| 3a      | Database oltre l'80 % | Pulizia delle voci cancellate                          | No, se tutti i dispositivi hanno sincronizzato    | a mano (automatica tolta nella v1.1)                              |
| 3b      | Database oltre l'80 % | Archiviare stagioni intere                             | Lo storico di quel periodo nelle analisi          | a mano, ultima risorsa                                            |
| 4       | Nessun margine        | Più spazio: piano Pro o FIT altrove                    | No, ma un costo o un servizio in più              | —                                                                 |

### Livello 0 – Controllo ed export

Ogni mese: **Dati** → **Spazio sul server** ed export JSON. I FIT vengono caricati **compressi** (circa metà dello spazio, senza perdite) e sul dispositivo restano in chiaro.

### Livello 2 – Libera spazio (archiviare i FIT più vecchi)

Da fare **dal PC** (nell'app sul telefono lo .zip non si può salvare):

1. **Dati** → **Spazio sul server** → **Libera spazio**.
2. Scegli l'età (1, 2 o 3 anni; predefinita 2): l'app dice quanti file ci sono.
3. **Prepara l'archivio** → **Scarica l'archivio (.zip)**. Il file si chiama `my-masterpiece-fit-AAAA-MM-GG.zip` (la data limite); dentro, un file per attività (`data_sport_id.fit`). Salvalo su Drive o sul PC.
4. **Ho salvato il file: libera spazio**: i file vengono tolti dal server e dalla cache; l'attività viene segnata come "archiviata" su tutti i dispositivi.

Cosa resta: la seduta con riepilogo, giri, RPE e note; analisi e record non cambiano. Cosa si perde: mappa, grafici, zone e migliori prestazioni di quelle attività; la pagina Attività mostra "File archiviato". **Per riaverli:** apri la seduta → **Importa .FIT** → scegli il file dallo .zip: torna sul dispositivo e sul server, senza doppioni.

### Livello 3a – Pulizia delle voci cancellate (a mano)

Quando cancelli qualcosa, sul server resta una riga vuota: serve agli altri dispositivi per sapere che va cancellata. Pesa circa 300 byte: 1000 cancellazioni ≈ 0,3 MB su 500 MB, quindi di norma non serve mai toglierle.

Fino alla v1.1 l'app le puliva da sola dopo 90 giorni; è stato tolto perché un dispositivo rimasto spento più a lungo (il PC per una stagione, un vecchio telefono) non riceveva più quelle cancellazioni e, rientrando nell'account, le faceva ricomparire su tutti i dispositivi.

Se un giorno servisse davvero (database oltre l'80 %):

1. Su **ogni** dispositivo che usi: apri l'app e controlla in **Dati** che la sincronizzazione sia verde. Esci dall'account sui dispositivi che non usi più.
2. Supabase → **SQL Editor** → **New query** → incolla ed esegui (**Run**):
   `delete from public.items where deleted and updated_at < now() - interval '365 days';`
3. Un dispositivo rimasto fuori che rientra nell'account può far ricomparire le voci cancellate: cancellale di nuovo da lì.

### Livello 3b – Archiviare stagioni intere (ultima risorsa)

Molto improbabile prima di decine di anni con un solo utente. Export JSON completo, poi si cancellano dall'app le sedute fino a una data. L'Analisi non vede più quel periodo; il JSON si può reimportare in un'altra installazione per consultarlo. Non c'è un pulsante: chiedi a Claude di farlo con te.

### Livello 4 – Più spazio

- **Supabase Pro**, circa 25 $/mese: 8 GB di database e 100 GB di Storage. Nessuna modifica all'app.
- **FIT su un altro servizio** gratuito (es. Cloudflare R2, 10 GB): nessun costo, ma un servizio e una chiave in più da gestire, e una modifica all'app.

## Ricominciare da zero

**Dati** → **Ricomincia da zero** (in fondo, riquadro rosso): cancella **tutto** e riporta l'app come appena installata (con gli esercizi di base).

- **Si cancellano:** sedute, attività Garmin e file FIT, esercizi, allenamenti, blocchi, fasi, data gara, obiettivo, impostazioni.
- **Restano:** accesso all'account, collegamento a intervals.icu, preferenze del dispositivo, backup (prima del reset ne viene salvato uno: "Prima di Ricomincia da zero").
- **Con l'account:** serve la connessione. Le cancellazioni vanno subito al server e i FIT vengono tolti dallo Storage; gli **altri dispositivi si svuotano da soli** alla prossima sincronizzazione (anche la loro cache dei FIT).
- Conferma scrivendo **AZZERA**. Non si annulla, salvo ripristinare il backup su quel dispositivo.

## Recupero

Se server e dispositivi non coincidono (per esempio dopo cancellazioni fatte a mano su Supabase): sul dispositivo con i dati giusti **Dati** → **Strumenti avanzati** → **Ricarica il server**. Svuota le tue righe sul server e ricarica tutto da quel dispositivo, file Garmin compresi; gli altri dispositivi lo ricevono alla sincronizzazione.

## Con più utenti

I limiti sono del progetto. Indicativamente, con 10 utenti attivi lo Storage arriva al livello 2 in 2–3 anni e il database resta lontano dal limite. Prima di aprire l'app ad altri conviene decidere tra livello 2 periodico e livello 4.

## Permessi su Supabase

Tutto questo richiede `supabase/schema.sql` aggiornato (cancellazione sulle proprie righe di `items`, cancellazione dei propri file nel bucket `fit`, funzione `purge_deleted_items`). Se un'operazione dice "manca il permesso", riesegui lo schema: Supabase → **SQL Editor** → **New query** → incolla tutto il file → **Run**.
