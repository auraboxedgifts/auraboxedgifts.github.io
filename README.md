# Aura Boxed Gifts

Professionalized storefront + Aura AI voice commerce flow.

## Project Structure

- `index.html` - landing page
- `collections/*.html` - generated product collection pages
- `js/api.js` - API client + environment-aware backend URL
- `js/auth.js` - OTP auth modal and account state
- `js/cart.js` - cart UI and server-side price calculation integration
- `js/checkout.js` - checkout + Razorpay flow
- `js/lightbox.js` - collection lightbox + AI context sync
- `aura-ai.js` - voice assistant widget + overlay navigation bridge
- `aura-ai/backend/server.js` - API, auth, orders, websocket AI bridge
- `aura-ai/backend/data/*.json` - product, collection, user, order data
- `aura-ai/backend/scripts/generate-pages.js` - collection page generator

## Local Run

1. Start backend:

```bash
cd aura-ai/backend
npm install
npm run dev
```

2. Serve frontend from project root with any static server (example):

```bash
python3 -m http.server 8000
```

3. Open:

- Frontend: `http://localhost:8000`
- Backend health: `http://localhost:5013/health`

## Android Orders App

Admin app for the client to view customer orders on their phone.

```bash
cd aura-orders-app
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

See `aura-orders-app/README.md` for details. Deploy updated backend (`/api/admin/orders` routes) to Oracle before using the app.

## Regenerate Collection Pages

```bash
node aura-ai/backend/scripts/generate-pages.js
```

This reads `aura-ai/backend/data/products.json` and rewrites all files in `collections/`.
