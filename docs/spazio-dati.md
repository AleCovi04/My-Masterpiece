# Spazio dei dati su Supabase

Cosa fare se lo spazio sul server cresce. Oggi basta per anni: questo documento serve per non improvvisare quando (e se) succederà.

## Gli spazi e i limiti

Piano gratuito di Supabase, limiti **del progetto** (con più utenti si dividono):

| Spazio       | Cosa contiene                                                                                                 | Limite | Consumo stimato (un utente) | Dura circa    |
| ------------ | ------------------------------------------------------------------------------------------------------------- | ------ | --------------------------- | ------------- |
| **Database** | Tutti i dati dell'app (tabella `items`): sedute, eseguiti, esercizi, allenamenti, blocchi, fasi, impostazioni | 500 MB | 5–10 MB all'anno            | oltre 40 anni |
| **Storage**  | File FIT originali di Garmin (bucket `fit`), compressi con gzip                                               | 1 GB   | 40–80 MB all'anno           | oltre 12 anni |

Dove vederlo:

- **Nell'app:** **Dati** → **Spazio sul server** (con l'account collegato). I dati sono una stima (il doppio del JSON di export); i file Garmin sono il valore vero del server.
- **Su Supabase:** **Organization** → **Usage** (valori esatti di tutto il progetto). Il database parte già da qualche decina di MB occupati dalle tabelle interne di Supabase: è normale.

## Cosa non fare mai

- **Cancellare righe dalla tabella `items`** dalla dashboard di Supabase: telefono e PC non se ne accorgono e non le rimandano; un dispositivo nuovo non le riceverà più. Server e dispositivi restano disallineati senza avvisi.
- **Cancellare file dal bucket `fit`** a mano: la pagina Attività perde mappa e grafici e l'app non sa perché.
- **Contare sul JSON di export per i file FIT:** l'export contiene tutti i dati ma **non** i FIT originali.

Per avere una copia tua basta l'export mensile (**Dati** → **Esporta tutto (JSON)**), salvato fuori dal telefono.

## I livelli

Si sale di livello solo quando serve. Ogni livello va realizzato nell'app **prima** di usarlo: chiedi a Claude di "realizzare il livello N di docs/spazio-dati.md".

| Livello | Quando                | Cosa                                  | Si perde qualcosa?                                | Stato      |
| ------- | --------------------- | ------------------------------------- | ------------------------------------------------- | ---------- |
| 0       | Sempre                | Controllo mensile ed export           | No                                                | ✅ attivo  |
| 1       | Storage oltre il 60 % | Ricomprimere i FIT vecchi             | No                                                | ⬜ da fare |
| 2       | Storage oltre l'80 %  | Archiviare i FIT più vecchi di N anni | Mappa e grafici di quelle attività (recuperabili) | ⬜ da fare |
| 3       | Database oltre l'80 % | Pulizia delle voci cancellate         | No (3a); storico nelle analisi (3b)               | ⬜ da fare |
| 4       | Nessun margine        | Più spazio: piano Pro o FIT altrove   | No, ma un costo o un servizio in più              | —          |

### Livello 0 – Controllo ed export (attivo)

Ogni mese (guida, §18): **Dati** → **Spazio sul server** o Supabase → **Usage**, ed export JSON. Dal 19/11/2026 i nuovi FIT vengono caricati **compressi** (circa metà dello spazio, senza perdite).

### Livello 1 – Ricomprimere i FIT vecchi

I FIT caricati prima del 19/11/2026 sono sul server non compressi. Un'azione in **Dati** li scarica uno alla volta, li comprime e li ricarica al loro posto.

- Nessuna perdita, nessun cambio per l'utente; si può interrompere e riprendere.
- Guadagno atteso: circa metà dello spazio di quei file.

### Livello 2 – Archiviare i FIT più vecchi

1. **Dati** → **Libera spazio** → scegli l'età (predefinita: più vecchi di 2 anni).
2. Anteprima: quanti file e quanti MB si liberano.
3. **Scarica l'archivio**: uno `.zip` con quei FIT, da salvare sul PC o su Drive. Senza questo passaggio non si va avanti.
4. **Conferma**: i file vengono tolti dal server e dalla cache del dispositivo.

Cosa resta: la seduta con riepilogo, giri, RPE e note; analisi e record non cambiano. Cosa si perde: mappa, grafici, zone e migliori prestazioni di quelle attività; la pagina Attività mostra "File archiviato". Per riaverli: **Importa .FIT** sulla stessa seduta con il file preso dallo `.zip` (l'app la riconosce, nessun doppione).

Da preparare quando lo si realizza: permesso di cancellazione sul bucket `fit` in `supabase/schema.sql` (oggi ci sono solo lettura, caricamento e sostituzione) da rieseguire su Supabase; segno "archiviato" sull'attività importata, compatibile con le versioni precedenti.

### Livello 3 – Database

Molto improbabile prima di decine di anni con un solo utente.

- **3a – Pulizia delle voci cancellate.** Quando cancelli qualcosa, sul server resta una riga vuota (serve agli altri dispositivi per saperlo). Una funzione SQL elimina quelle più vecchie di 90 giorni. Nessuna perdita.
- **3b – Archiviare stagioni intere** (ultima risorsa): export JSON delle sedute fino a una data, poi rimozione dall'app. L'Analisi non vede più quel periodo; il JSON si può reimportare in un'altra installazione per consultarlo.

### Livello 4 – Più spazio

- **Supabase Pro**, circa 25 $/mese: 8 GB di database e 100 GB di Storage. Nessuna modifica all'app.
- **FIT su un altro servizio** gratuito (es. Cloudflare R2, 10 GB): nessun costo, ma un servizio e una chiave in più da gestire, e una modifica all'app.

## Con più utenti

I limiti sono del progetto. Indicativamente, con 10 utenti attivi lo Storage arriva al livello 2 in 1–2 anni e il database resta lontano dal limite. Prima di aprire l'app ad altri conviene decidere tra livello 2 periodico e livello 4.

## Strumento di recupero (se server e dispositivi si disallineano)

Se un giorno qualcuno cancellasse dati dal server a mano: "Ricarica il server da questo dispositivo" svuoterebbe le proprie righe sul server e rimetterebbe in coda tutti i dati del dispositivo scelto (prima con un backup). Non è realizzato: va fatto solo se serve.
