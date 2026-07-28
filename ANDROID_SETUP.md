# Install VS Invoice on Your Android Phone

Your invoice app is now set up as a **real Android app** (not just a browser page). The same code can later be published on the Google Play Store.

## What you need on your Mac (one-time setup)

1. **Android Studio** — download from [developer.android.com/studio](https://developer.android.com/studio)
2. During install, include:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (optional, for emulator)

3. After installing Android Studio, open it once so it finishes downloading SDK components.

4. **Java** — Android Studio includes this. No separate install usually needed.

---

## Build the app (every time you change code)

In Terminal:

```bash
cd /Users/veerpalsingh/business
npm install
npm run android:apk
```

When it succeeds, your install file is here:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Put the app on your phone — Method 1: USB cable (easiest)

1. On your Android phone:
   - Settings → About Phone → tap **Build number** 7 times (enables Developer options)
   - Settings → Developer options → turn on **USB debugging**

2. Connect phone to Mac with USB cable.

3. On phone, allow USB debugging when prompted.

4. Run:

```bash
cd /Users/veerpalsingh/business
npm run android:install
```

This builds the app and installs it directly on your phone.

---

## Method 2: Copy APK file (no cable after build)

1. Build the APK (see above).

2. Send `app-debug.apk` to your phone:
   - WhatsApp to yourself
   - Google Drive
   - USB file transfer
   - Email

3. On phone, open the APK file.

4. If asked, allow **Install from unknown sources** for your file manager or browser.

5. Tap **Install**. The app **VS Invoice** appears on your home screen.

---

## Method 3: Android Studio (visual)

```bash
cd /Users/veerpalsingh/business
npm run cap:sync
npm run cap:open:android
```

Android Studio opens. Then:

1. Connect your phone (USB debugging on)
2. Click the green **Run** button
3. Select your phone → app installs automatically

---

## Using the app on your phone

- **Create** tab — fill invoice details, line items, labour, SIT, expenses
- **Preview** tab — see the full bill
- **Print** — opens print dialog (can save as PDF on many phones)

Works fully offline after install. No internet needed.

---

## After you edit the app code

Run again:

```bash
npm run android:apk
```

Then reinstall on phone (Method 1 or 2).

---

## Future: Google Play Store

When you want to commercialize:

1. Create a Google Play Developer account (one-time fee)
2. Build a signed **release** APK/AAB (not debug)
3. Upload to Play Console

The project is already structured for this using **Capacitor** — the same app goes to Play Store with signing and a release build.

---

## iPhone note

This setup is for **Android**. For iPhone you need a Mac, Xcode, and an Apple Developer account. Say if you want iPhone steps later.

---

## Quick command summary

| Task | Command |
|------|---------|
| Test in browser | `npm run dev` |
| Build Android APK | `npm run android:apk` |
| Install on connected phone | `npm run android:install` |
| Open in Android Studio | `npm run cap:open:android` |
