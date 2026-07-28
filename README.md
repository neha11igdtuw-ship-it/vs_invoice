# Veerpal Singh Invoice App

Invoice app for **Veerpal Singh — Fruit Commission Agents & Order Suppliers**.

Works as:
- **Website** in browser (`npm run dev`)
- **Android app** on your phone (see [ANDROID_SETUP.md](./ANDROID_SETUP.md))

## Features

- Firm header with name, trademark block, address, and date
- GR / invoice number, customer name, truck no., challan no., nag
- Line items: description, quantity, rate, auto-calculated gross sale
- Auto labour: rate per nag × total nags
- Auto Forwarding / SIT: % of gross total
- Standard and additional expenses
- Print-ready invoice layout matching your paper bill

## Run in browser

```bash
npm install
npm run dev
```

## Install on Android phone

**Full step-by-step guide:** [ANDROID_SETUP.md](./ANDROID_SETUP.md)

Quick version:

1. Install **Android Studio** on your Mac (one time)
2. Build APK:
   ```bash
   npm run android:apk
   ```
3. Copy `android/app/build/outputs/apk/debug/app-debug.apk` to your phone and install  
   **OR** connect phone by USB and run:
   ```bash
   npm run android:install
   ```

The app icon **VS Invoice** will appear on your phone. Works offline.

## Future Play Store

The app uses **Capacitor** — the same project can be signed and published to Google Play when you are ready.

## Build for production

```bash
npm run build
npm run preview
```
