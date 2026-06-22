# FCM setup — Aura Orders Android app

Push notifications use Firebase Cloud Messaging (FCM) on the app and `firebase-admin` on the backend (`aura-ai/backend/fcm.js`).

## 1. Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/) and create or select a project.
2. Add an **Android app** with package name: `com.auraboxedgifts.orders`
3. Download **`google-services.json`** and replace:
   `aura-orders-app/app/google-services.json`
   (The repo includes a placeholder file so Gradle can build; replace it for real push delivery.)

## 2. Android app (already wired)

- `AuraFirebaseMessagingService` — receives pushes and shows notifications
- Token registration on login via `POST /api/fcm/register`
- `CartReminderWorker` — after 6 hours with items in cart, calls `POST /api/fcm/cart-reminder`
- Dependencies: Firebase Messaging in `app/build.gradle.kts`

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

Use a Firebase **service account** JSON (Project settings → Service accounts → Generate new private key). Paste the full JSON as one line or store the file and point `FIREBASE_SERVICE_ACCOUNT_PATH` at it.

Without either variable, the server still runs; FCM sends are skipped with a log message.

## 4. What gets pushed

| Event | Recipients |
|-------|------------|
| Payment verified (`/api/verify-payment`) | Admin tokens + customer email tokens |
| Cart reminder (`/api/fcm/cart-reminder`) | Logged-in customer with cart items |

Admin new-order polling (WorkManager) still works when FCM is not configured.

## 5. Test

1. Install debug APK, sign in as customer or admin.
2. Confirm token registration: check `aura-ai/backend/data/fcm-tokens.json` on the server.
3. Place a test order or use admin **Testing & Setup** tools.
4. For cart reminder: add items, wait for worker (or temporarily reduce delay in `CartReminderWorker.kt` for local testing).
