# Aura Backend — Email & WhatsApp Setup (Oracle + PM2)

The backend reads all secrets from `aura-ai/backend/.env`. After editing that file you
**must restart PM2** so the new values are loaded. Use the **Testing & Setup** tab in the
admin panel to confirm everything works (Send test email / Send test WhatsApp / ₹1 test order).

---

## 0. Where things live

```
aura-ai/backend/
  .env            <- your real secrets (NOT committed)
  .env.example    <- template, copy it
  server.js
```

If `.env` doesn't exist yet:

```bash
cd ~/auraboxedgifts.github.io/aura-ai/backend   # adjust to your path on the Oracle box
cp .env.example .env
nano .env
```

---

## 1. Email (Gmail + App Password)

Order confirmation emails to customers and alerts to you are sent through Gmail.

1. Use a Gmail account for the store (e.g. `auraboxedgifts@gmail.com`).
2. Turn on **2-Step Verification**: <https://myaccount.google.com/security>
3. Create an **App Password**: <https://myaccount.google.com/apppasswords>
   - App: *Mail*, Device: *Other* → name it "Aura". Copy the 16-character password.
4. In `.env` set:

   ```env
   EMAIL_USER=auraboxedgifts@gmail.com
   EMAIL_APP_PASSWORD=the16charapppassword     # no spaces
   RECIPIENT_EMAIL=where_you_want_order_alerts@gmail.com
   ```

   - `EMAIL_USER` = the Gmail account that **sends** mail (SMTP login; appears as **From**).
   - `RECIPIENT_EMAIL` = the inbox that **receives** order alerts and custom hamper inquiries (**To**).
   - These are often different addresses. If you only set `EMAIL_USER`, alerts still go to `RECIPIENT_EMAIL` — not automatically to `EMAIL_USER`.
   - If `RECIPIENT_EMAIL` is unset, the backend falls back to `EMAIL_USER`.

5. Restart and test (see section 3), then click **Send test email** in the admin panel.

---

## 2. WhatsApp (CallMeBot — free)

Sends an instant WhatsApp message to the owner on every order.

1. On the phone that should RECEIVE alerts, save this contact: **+34 644 51 95 23**.
2. From that phone's WhatsApp, send this exact message to it:

   ```
   I allow callmebot to send me messages
   ```

3. You'll get a reply with your **API key** (a number).
4. In `.env` set (phone in full international format, **no `+`**, no spaces):

   ```env
   CALLMEBOT_PHONE=919876543210      # 91 = India, then the 10-digit number
   CALLMEBOT_API_KEY=123456
   ```

5. Restart and test, then click **Send test WhatsApp** in the admin panel.

> Note: the CallMeBot activation occasionally needs to be re-done if you don't use it
> for a long time. If test messages stop arriving, repeat steps 1–3.

---

## 3. Apply changes with PM2

From the backend folder:

```bash
cd ~/auraboxedgifts.github.io/aura-ai/backend

# See the running process name/id
pm2 list

# Restart it and reload the new .env values
pm2 restart aura-backend --update-env      # use your actual process name from `pm2 list`

# Watch logs to confirm a clean boot
pm2 logs aura-backend
```

If you don't have it under PM2 yet:

```bash
pm2 start server.js --name aura-backend --update-env
pm2 save
```

`--update-env` is important: without it, PM2 keeps the OLD environment and your new
email/WhatsApp values won't take effect.

---

## 4. Verify from the admin panel

1. Open the site → log in as admin → **Testing & Setup** tab.
2. Each integration shows a green dot (Configured) or red dot (Not configured).
3. **Send test email** → check the inbox of `RECIPIENT_EMAIL` (and Spam).
4. **Send test WhatsApp** → check the phone you activated.
5. **Place a ₹1 test order** → this records a real (test-flagged) order and fires the same
   email + WhatsApp alerts a customer order would, so you can preview the full experience.

---

## 5. Other useful keys (already in `.env.example`)

| Key | Purpose |
|-----|---------|
| `GEMINI_API_KEY` | Aura AI voice assistant |
| `JWT_SECRET` | Login token signing (use a long random string) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin panel login |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Accept real online payments |
| `GOOGLE_MAPS_API_KEY` | Address autocomplete at checkout |
| `GITHUB_TOKEN` | Lets **Apply & Publish** push to GitHub Pages |
| `PUBLIC_BASE_URL` | Public URL of this backend, e.g. `https://aura.devshubh.me` (so uploaded images load on the static site) |

Always `pm2 restart aura-backend --update-env` after editing `.env`.

---

## 6. Updating code on Oracle (`git pull` without fights)

Admin edits write live files under `aura-ai/backend/data/` (`site.json`, `products.json`,
`collections.json`). Those are tracked by git, so a plain `git pull` often fails with
“unstaged changes”.

**Use this instead** (from the repo root on Oracle):

```bash
cd ~/auraboxedgifts.github.io
git pull origin main          # get the helper script first if you don't have it yet
chmod +x scripts/oracle-pull.sh

# One-time: stop live data files from blocking future pulls
./scripts/oracle-pull.sh --setup

# Every deploy after that (pull + keep live data + restart pm2)
./scripts/oracle-pull.sh
```

## 7. Google Sign-In (website)

Uses **Google Identity Services** (current Google policy — not the old `platform.js` library).

### What you need from Google Cloud Console

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create / select a project (e.g. `Aura Boxed Gifts`)
3. Configure **OAuth consent screen** (External):
   - App name: `Aura Boxed Gifts`
   - User support email + developer contact: your email
   - Scopes: default (`openid`, `email`, `profile`) is enough
4. Create credentials → **OAuth client ID** → Application type **Web application**
5. **Authorized JavaScript origins** (scheme + host only, no path):
   - `https://auraboxedgifts.in`
   - `https://www.auraboxedgifts.in` (if you use www)
   - `http://localhost:5500` (optional local testing)
6. Copy the **Client ID** (looks like `123456789-xxxx.apps.googleusercontent.com`)

You do **not** need the client secret for the button flow (ID token is verified server-side with the Client ID).

### Enable on Oracle

```bash
cd ~/auraboxedgifts.github.io/aura-ai/backend
nano .env
# add:
# GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

pm2 restart aura-ai --update-env
```

Then hard-refresh the website. The login modal shows **Continue with Google**; name/email are saved automatically for checkout.

Android Google Sign-In can reuse the same `/api/auth/google` endpoint later (needs a separate Android OAuth client ID).
