# Install VS Invoice on Redmi (No USB — Permanent)

Once installed, the app stays on your phone **forever** — like WhatsApp or Calculator.  
You do **not** need USB, Mac, or internet to use it daily.

You only need the Mac **once** to create the install file (APK). After that, everything happens on your phone.

---

## Part A — One time on your Mac

### 1. Install Android Studio

Download: https://developer.android.com/studio  

Install it → open it → wait until it finishes downloading SDK (first time only).

### 2. Build the install file

Open **Terminal** on Mac and run:

```bash
cd /Users/veerpalsingh/business
npm install
npm run android:apk
```

If successful, this file is created:

```
/Users/veerpalsingh/business/android/app/build/outputs/apk/debug/app-debug.apk
```

This **one file** is your whole app.

---

## Part B — Send APK to Redmi (no USB)

Pick **any one** method:

### Option 1 — WhatsApp (easiest)
1. On Mac, find `app-debug.apk`
2. Send it to yourself on WhatsApp (or to a family group)
3. On Redmi, open WhatsApp → download the file

### Option 2 — Google Drive
1. Upload `app-debug.apk` to Google Drive from Mac
2. On Redmi, open Drive app → download the file

### Option 3 — Telegram / Email
Same idea — send the APK file to yourself and download on phone.

---

## Part C — Install on Redmi (MIUI)

### Step 1 — Allow install from files

On Redmi (HyperOS / MIUI):

1. Open **Settings**
2. Go to **Privacy** → **Special permissions** (or **Additional settings**)
3. Tap **Install unknown apps**
4. Select the app you will use to open the APK:
   - **Files** (if opening from file manager)
   - **WhatsApp** (if installing from WhatsApp)
5. Turn on **Allow from this source**

### Step 2 — Open the APK

1. Open **Files** app (or tap the downloaded APK in WhatsApp)
2. Tap **app-debug.apk**
3. Tap **Install**
4. If MIUI shows a security warning → tap **Install anyway** or **Allow**

### Step 3 — Done

- App name: **VS Invoice**
- It appears on your home screen / app drawer
- Open it anytime — works **offline**
- Stays on phone until **you** uninstall it

---

## Daily use (no Mac, no USB)

1. Open **VS Invoice** on Redmi
2. **Create** tab → enter invoice
3. **Preview** tab → check bill
4. **Print** → print or save PDF

Your Mac is not needed for daily work.

---

## If Redmi blocks the install

Try these:

1. **Settings → Apps → Manage apps → VS Invoice** — check it is not restricted  
2. Turn off **MIUI optimization** temporarily (Developer options) — usually not needed  
3. Make sure you allowed **Install unknown apps** for WhatsApp/Files  
4. Download the APK again — sometimes download gets corrupted  

---

## Updating the app later

When you change features on Mac:

1. Run `npm run android:apk` again on Mac  
2. Send new APK to Redmi (WhatsApp/Drive)  
3. Install again — it replaces the old version  
4. Your old data may reset (invoices are not saved yet — future feature)

---

## Summary

| Question | Answer |
|----------|--------|
| Permanent on phone? | **Yes** — install once, stays forever |
| USB needed? | **No** — send APK by WhatsApp/Drive |
| Internet needed daily? | **No** — works offline |
| Mac needed daily? | **No** — only to build/update APK |
| Play Store needed? | **No** — for personal use now |

---

## Play Store later

When you want to sell the app publicly, the same project can go to Play Store.  
For now, APK install on your Redmi is enough for personal daily use.
