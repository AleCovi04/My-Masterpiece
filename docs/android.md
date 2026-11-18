# App Android (Capacitor)

L'app Android è la stessa app web, impacchettata con Capacitor (cartella `android/`, id `app.mymasterpiece.android`). I file dell'app sono dentro l'APK, quindi funziona sempre offline; ogni aggiornamento richiede un nuovo APK. La PWA resta disponibile come prima.

## 1. Login con codice: SMTP con Resend (una volta)

Nell'app il link dell'email aprirebbe il browser, non l'app: serve il **codice** da digitare. Supabase lo mette nelle email solo con un SMTP proprio.

1. Crea un account gratuito su [resend.com](https://resend.com) **con la stessa email con cui accedi all'app** (senza un dominio verificato, Resend invia solo a quell'indirizzo).
2. Resend → **API Keys** → **Create API Key** (permesso "Sending access"): copia la chiave (`re_…`).
3. Supabase → **Authentication** → **Emails** → **SMTP Settings** → attiva **Enable custom SMTP**:
   - Sender email: `onboarding@resend.dev` · Sender name: `My Masterpiece`
   - Host: `smtp.resend.com` · Port: `465`
   - Username: `resend` · Password: la chiave `re_…`
   - **Save**.
4. Ora i modelli si possono modificare: **Authentication** → **Emails** → **Magic Link** e **Confirm signup**: nel corpo aggiungi una riga con il codice, per esempio `<p>Codice: <strong>{{ .Token }}</strong></p>`, e salva.
5. Facoltativo: **Authentication** → **Rate Limits** → alza il limite di email all'ora (es. 30).

Prova dal PC: Dati → Inviami il link → l'email deve contenere anche il codice.

## 2. Segreti per l'APK (una volta)

La chiave di firma è stata generata in `Documenti\MyMasterpiece-chiave-android\` (fuori dal progetto, mai su git). **Fanne una copia di sicurezza** (es. Google Drive): senza la stessa chiave gli aggiornamenti richiedono di disinstallare l'app (i dati restano comunque sul server).

Su GitHub → [Settings → Secrets → Actions](https://github.com/AleCovi04/My-Masterpiece/settings/secrets/actions) → **New repository secret**:

| Name                        | Valore                                         |
| --------------------------- | ---------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | tutto il contenuto di `release.p12.base64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | il contenuto di `password.txt`                 |

`SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` ci sono già (anti-pausa).

## 3. Costruire e installare l'APK

1. GitHub → [Actions → Android APK](https://github.com/AleCovi04/My-Masterpiece/actions/workflows/android-apk.yml) → **Run workflow** (circa 5–10 minuti). In alternativa un tag `v*` (es. `v1.0.0`).
2. Dal telefono apri [Releases → ultima](https://github.com/AleCovi04/My-Masterpiece/releases/latest) e scarica `my-masterpiece.apk`.
3. Aprilo: Android chiede di consentire l'installazione da questa fonte (Chrome o File) → consenti → **Installa**.
4. Apri l'app → Dati → accedi con l'email e il **codice**. I dati arrivano dal server.
5. Alla prima pausa di recupero l'app chiede il permesso per le notifiche: **Consenti**.

Aggiornare: rilancia il workflow e installa il nuovo APK sopra quello vecchio (stessa chiave, dati conservati).

## Notifica di fine recupero

- Programmata quando parte il recupero, spostata con −15 s / +15 s / a mano, annullata se lo salti o se l'allenamento finisce o si annulla.
- Suona e vibra anche a schermo spento (canale "Fine del recupero", priorità alta; allarme esatto `USE_EXACT_ALARM`).
- Se arriva in ritardo: Impostazioni di Android → App → My Masterpiece → Batteria → **Senza restrizioni**.
- Nella PWA non cambia nulla.

## Per lo sviluppo

- Icone e schermata di avvio: `python scripts/make-icons.py` (dal logo `assets/logo.jpeg`).
- Dopo una modifica all'app web: `npm run build` e `npx cap sync android` (lo fa anche il workflow).
- Nell'app nativa il service worker della PWA non si registra (`src/app/serviceWorker.ts`).
