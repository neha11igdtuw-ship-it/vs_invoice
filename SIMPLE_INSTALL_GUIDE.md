# Simple Guide — Install VS Invoice on Redmi (No USB)

## Why your APK was not found before

The build **failed** because Java was not set up.  
So the file was **never created**.

The old APKs from April are from a **different project** (TaskMatrixProject), not this invoice app.

**This is now fixed.** The app file is ready.

---

## Your app file is here

**Easy to find (on Desktop):**

```
Desktop → VS-Invoice.apk
```

**Original location:**

```
business → android → app → build → outputs → apk → debug → app-debug.apk
```

---

## Step 1 — Send to Redmi (WhatsApp)

1. On Mac, open **Desktop**
2. Find **VS-Invoice.apk**
3. Open **WhatsApp Web** or WhatsApp on Mac
4. Send **VS-Invoice.apk** to yourself (your own number)

---

## Step 2 — Download on Redmi

1. Open WhatsApp on Redmi
2. Open the chat where you sent the file
3. Tap the file → **Download**

---

## Step 3 — Allow install on Redmi

1. Open **Settings**
2. Go to **Privacy** → **Special app access** (or **Install unknown apps**)
3. Tap **WhatsApp**
4. Turn on **Allow from this source**

---

## Step 4 — Install on Redmi

1. In WhatsApp, tap **VS-Invoice.apk** again
2. Tap **Install**
3. If Redmi warns you → tap **Install anyway**
4. Tap **Open** or find **VS Invoice** on home screen

---

## Step 5 — Use daily

Open **VS Invoice** on phone:

- **Create** → fill invoice
- **Preview** → see bill
- **Print** → print or save PDF

No USB. No Mac needed daily. Works offline.

---

## If you change the app later (rebuild on Mac)

Open Terminal and run:

```bash
cd /Users/veerpalsingh/business
npm run android:apk
```

Then copy new file from Desktop (run this to copy again):

```bash
cp /Users/veerpalsingh/business/android/app/build/outputs/apk/debug/app-debug.apk ~/Desktop/VS-Invoice.apk
```

Send new **VS-Invoice.apk** to Redmi and install again.

---

## Quick checklist

- [ ] File on Desktop: **VS-Invoice.apk**
- [ ] Sent to Redmi via WhatsApp
- [ ] Allowed install from WhatsApp in Settings
- [ ] Installed **VS Invoice** on phone
- [ ] App opens and works offline
