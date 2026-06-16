# Aura Orders — Android app for Aura Boxed Gifts

Minimal admin app to view and manage customer orders from the Oracle-hosted backend.

## Features

- Admin login (same credentials as the website dashboard)
- Live order list with **pull-to-refresh** (swipe down)
- **Push-style notifications** when a new website order arrives (polls every 45s in app, every 15 min in background)
- Filter by All / Paid / Pending
- Order detail: customer info, product images, totals, shipping address
- Update order status — customer gets an **email** for each status change (Confirmed, Processing, Shipped, Delivered, etc.)

## Backend

Connects to `https://aura.devshubh.me`. Product thumbnails load from the same `/images/...` paths as the website.

Branding assets are copied from the website repo:

- `images/logo.jpeg` → app icon + login logo
- `images/web/auraboxedgifts.png` → login background

- `POST /api/admin/login`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id`

Deploy the updated `aura-ai/backend/server.js` to Oracle before using the app.

## Build

```bash
cd aura-orders-app
export ANDROID_HOME=~/Android/Sdk
./gradlew assembleDebug
```

APK output: `app/build/outputs/apk/debug/app-debug.apk`

## Install on device

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Login

Use the `ADMIN_EMAIL` and `ADMIN_PASSWORD` configured in the backend `.env` on Oracle — the same credentials used for the website admin panel.
