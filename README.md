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

## Run locally with the backend

Requires Node 20+ and a MongoDB replica set (a free MongoDB Atlas cluster works, or local `mongod --replSet rs0`).

```bash
cp server/.env.example server/.env   # fill in DATABASE_URL, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
npm install
npm run db:setup                     # installs server deps and creates DB indexes
npm run dev:all                      # API on :3001, web on :5173
```

The first admin login is created from `ADMIN_USERNAME` / `ADMIN_PASSWORD` on the first server start.
There is no public sign-up.

## Deploy to Render

The repo includes a `render.yaml` Blueprint. One web service serves both the API and the web app.

1. Create a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster. Create a database user, and under
   Network Access allow Render to connect (`0.0.0.0/0`, protected by the DB user's password, or Render's outbound IPs).
   Copy the connection string and put `/vs_invoice` as the database name.
2. In Render: **New → Blueprint**, pick this GitHub repo.
3. When prompted, set `DATABASE_URL`, `ADMIN_USERNAME` and `ADMIN_PASSWORD` (8+ characters).
   `JWT_SECRET` is generated for you.
4. Deploy. Health check is `/api/health`. Sign in with the admin credentials you set.

Changing `ADMIN_PASSWORD` later does not change an existing user's password; the admin is only created when no user exists.

### Environment variables

| Name | Required | Notes |
|------|----------|-------|
| `DATABASE_URL` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | 32+ characters in production |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | first run | Creates the first login |
| `SESSION_HOURS` | no | Login lifetime, default 12 |
| `CORS_ORIGIN` | no | Only if the web app is on a different origin |

### Notes

- The free Render plan sleeps after inactivity, so the first request can take ~30-60 seconds.
- The Android app is independent: it stores data on the phone and does not use the server.
- Back up the Atlas cluster (Atlas has scheduled backups on paid tiers; use `mongodump` on the free tier).
