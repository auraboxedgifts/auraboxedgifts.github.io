# FCM setup — Aura Orders Android app

Push notifications use Firebase Cloud Messaging (FCM) on the app and `firebase-admin` on the backend (`aura-ai/backend/fcm.js`).

## 1. Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/) and create or select a project.
2. Add an **Android app** with package name: `com.auraboxedgifts.orders`
3. Download **`google-services.json`** and replace:
   `aura-orders-app/app/google-services.json`

## 2. Android app (already wired)

- `AuraFirebaseMessagingService` — receives pushes and shows notifications (with optional images)
- Token registration on login via `POST /api/fcm/register`
- Notification channels: admin orders, customer order updates, promotions
- `CartReminderWorker` — after 6 hours with items in cart, calls `POST /api/fcm/cart-reminder`

Rebuild after replacing `google-services.json`:

```bash
cd aura-orders-app
./gradlew assembleDebug
```

## 3. Backend

Install dependencies (includes `firebase-admin`):

```bash
cd aura-ai/backend
npm install
```

Set on the server (e.g. `.env` or hosting env vars):

```bash
# Option A — inline JSON (one line)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Option B — file path (handy on Oracle / VPS)
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json
```

Or place `firebase-service-account.json` in `aura-ai/backend/` (auto-detected).

## 4. What gets pushed

| Event | Recipients |
|-------|------------|
| Payment verified | Admin tokens + customer (order confirmed) |
| Admin updates order status (app or web) | Customer who placed the order (by email / FCM token) |
| Admin broadcast (web or app) | All logged-in customer devices |
| Daily digest (cron or manual) | All logged-in customer devices |
| Cart reminder | Logged-in customer with cart items |

## 5. Admin broadcast (web + Android app)

**Web admin → Testing & Setup → Customer push notifications**

Fields: title, message, optional image URL.

**Android admin → Profile tab → Customer push (FCM)**

Same fields; sends via `POST /api/admin/fcm/broadcast`.

**New-products digest button** (web) or:

```bash
cd aura-ai/backend
npm run fcm:digest
```

## 6. CLI script for announcements

```bash
cd aura-ai/backend

# Custom message
npm run fcm:announce -- --title "New drop" --body "Fresh hampers in store" --image https://aura.devshubh.me/uploads/banner.jpg

# Announce a specific product
node scripts/fcm-announce.js --product <productId>

# App version update
node scripts/fcm-announce.js --version 1.3.5

# Daily new-products digest (use in cron)
npm run fcm:digest

# Check registered devices
npm run fcm:stats
```

### Daily cron on Oracle (example — 10:00 AM IST)

```bash
crontab -e
# Add:
0 10 * * * cd /home/ubuntu/auraboxedgifts.github.io/aura-ai/backend && /usr/bin/node scripts/fcm-announce.js --digest >> /tmp/aura-fcm-digest.log 2>&1
```

## 7. Test

1. Install debug APK; sign in as **customer** (registers customer FCM token).
2. Sign in as **admin** on another device (registers admin token).
3. Place or create a test order; update status in admin — customer should get push with their name.
4. Send a broadcast from web admin or app Profile tab.
5. Check server logs: `pm2 logs aura-backend | grep FCM`

Customer tokens are stored in `aura-ai/backend/data/fcm-tokens.json`.
