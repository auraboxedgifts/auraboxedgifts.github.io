# Aura Boxed Gift — Android admin app

Professional store management app for Aura Boxed Gifts. Manage orders and browse your live product catalog from one place.

## Features

### Dashboard (Home)
- Store overview with order and product stats
- Recent orders at a glance
- Quick links to orders and catalog

### Orders
- Admin login (same credentials as the website dashboard)
- Live order list with **pull-to-refresh**
- **Notifications** when new website orders arrive (polls every 45s in app, every 15 min in background)
- Filter by All / Paid / Pending
- Order detail: customer info, product images, totals, shipping address
- Update order status — customer gets an **email** for each status change

### Catalog
- **Live product catalog** synced from the website (`products.json` via API)
- Browse all products with images, prices, and collections
- Filter by collection, search by name/tags
- Product detail view with description and tags
- Products added in the website admin appear here automatically

### Profile
- Admin account info and store details
- Sign out

## Product data sync

Products are stored on the backend at `aura-ai/backend/data/products.json`. The app loads them via:

- `GET /api/products` — all products (same data as the website)
- `GET /api/collections` — collection names and metadata

When you add or edit products in the website admin panel, pull-to-refresh on the Catalog tab to see updates.

Images use the same `/images/web/...` paths as the website, loaded from `https://aura.devshubh.me`.

## Backend

Connects to `https://aura.devshubh.me`.

**Admin APIs:**
- `POST /api/admin/login`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id`

**Catalog APIs (public):**
- `GET /api/products`
- `GET /api/collections`

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

Use the `ADMIN_EMAIL` and `ADMIN_PASSWORD` configured in the backend `.env` — the same credentials used for the website admin panel.
