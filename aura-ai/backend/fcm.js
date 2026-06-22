const fs = require('fs');
const path = require('path');

const TOKENS_FILE = path.join(__dirname, 'data', 'fcm-tokens.json');
const ANDROID_CHANNEL_ID = 'aura_new_orders';

function readTokens() {
    try {
        return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    } catch (_) {
        return { admin: [], customers: {} };
    }
}

function writeTokens(data) {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2));
}

let firebaseReady = false;

function initFirebase() {
    if (firebaseReady) return true;
    const json = loadServiceAccountJson();
    if (!json) return false;
    try {
        const admin = require('firebase-admin');
        const cred = JSON.parse(json);
        if (!admin.apps.length) {
            admin.initializeApp({ credential: admin.credential.cert(cred) });
        }
        firebaseReady = true;
        console.log('[FCM] Firebase Admin initialized for project:', cred.project_id || '(unknown)');
        return true;
    } catch (err) {
        console.error('[FCM] Init failed:', err.message);
        return false;
    }
}

function loadServiceAccountJson() {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        return process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    }
    const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (filePath) {
        try {
            const resolved = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
            if (fs.existsSync(resolved)) {
                return fs.readFileSync(resolved, 'utf8');
            }
        } catch (err) {
            console.error('[FCM] Could not read service account file:', err.message);
        }
    }
    const defaultPath = path.join(__dirname, 'firebase-service-account.json');
    if (fs.existsSync(defaultPath)) {
        try {
            return fs.readFileSync(defaultPath, 'utf8');
        } catch (err) {
            console.error('[FCM] Could not read default service account file:', err.message);
        }
    }
    return null;
}

function pruneInvalidTokens(role, email, tokensToRemove) {
    if (!tokensToRemove?.length) return;
    const store = readTokens();
    if (role === 'admin') {
        store.admin = store.admin.filter((t) => !tokensToRemove.includes(t));
    } else if (email) {
        const key = String(email).trim().toLowerCase();
        store.customers[key] = (store.customers[key] || []).filter((t) => !tokensToRemove.includes(t));
    }
    writeTokens(store);
    console.log(`[FCM] Pruned ${tokensToRemove.length} invalid token(s) for role=${role}`);
}

function registerToken({ token, role, email }) {
    if (!token) return;
    const store = readTokens();
    if (role === 'admin') {
        if (!store.admin.includes(token)) store.admin.push(token);
    } else if (email) {
        const key = String(email).trim().toLowerCase();
        store.customers[key] = store.customers[key] || [];
        if (!store.customers[key].includes(token)) store.customers[key].push(token);
    }
    writeTokens(store);
    console.log(
        `[FCM] Registered ${role} token for ${email || 'unknown'} ` +
        `(${token.slice(0, 12)}…) — admin pool: ${store.admin.length}`
    );
}

async function sendPush(tokens, notification, data = {}, logContext = 'push') {
    const unique = [...new Set((tokens || []).filter(Boolean))];
    if (!unique.length) {
        console.log(`[FCM] ${logContext}: no tokens registered — skipping`);
        return { sent: 0, failed: 0, skipped: true, reason: 'no_tokens' };
    }
    if (!initFirebase()) {
        console.log(`[FCM] ${logContext}: Firebase not configured — skipping (${unique.length} token(s) waiting)`);
        return { sent: 0, failed: 0, skipped: true, reason: 'firebase_not_configured' };
    }

    const admin = require('firebase-admin');
    const payload = {
        tokens: unique,
        notification,
        data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v ?? '')])
        ),
        android: {
            priority: 'high',
            notification: {
                channelId: ANDROID_CHANNEL_ID,
                priority: 'high',
                defaultSound: true,
                notificationCount: 1
            }
        }
    };

    console.log(
        `[FCM] ${logContext}: sending "${notification.title}" to ${unique.length} device(s) ` +
        `(orderId=${data.orderId || '-'})`
    );

    const res = await admin.messaging().sendEachForMulticast(payload);
    const invalidTokens = [];
    res.responses.forEach((r, idx) => {
        if (r.success) return;
        const token = unique[idx];
        const code = r.error?.code || 'unknown';
        console.error(`[FCM] ${logContext}: delivery failed token=${token.slice(0, 12)}… code=${code} msg=${r.error?.message || 'n/a'}`);
        if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
        ) {
            invalidTokens.push(token);
        }
    });

    if (invalidTokens.length) {
        pruneInvalidTokens(logContext.includes('admin') ? 'admin' : 'customer', data.email, invalidTokens);
    }

    const summary = { sent: res.successCount, failed: res.failureCount, tokens: unique.length };
    console.log(`[FCM] ${logContext}: done sent=${summary.sent} failed=${summary.failed}`);
    return summary;
}

async function notifyAdminsNewOrder(order) {
    const store = readTokens();
    const total = order.cart?.grandTotal ?? 0;
    const orderId = order.id || '';
    console.log(`[FCM] New order ${orderId}: notifying ${store.admin.length} admin token(s)`);
    return sendPush(
        store.admin,
        {
            title: 'New order received',
            body: `${order.customer?.name || 'Customer'} — ₹${total} (${orderId})`
        },
        { type: 'new_order', orderId, title: 'New order received', body: `${order.customer?.name || 'Customer'} — ₹${total} (${orderId})` },
        `admin-new-order:${orderId}`
    );
}

async function notifyCustomerOrderConfirmed(email, order) {
    const store = readTokens();
    const key = String(email || '').trim().toLowerCase();
    const tokens = store.customers[key] || [];
    console.log(`[FCM] Order confirmed ${order.id}: notifying customer ${key || '-'} (${tokens.length} token(s))`);
    return sendPush(
        tokens,
        {
            title: 'Order confirmed',
            body: `Thank you! Order ${order.id} is confirmed. Total ₹${order.cart?.grandTotal ?? 0}.`
        },
        { type: 'order_confirmed', orderId: order.id, email: key },
        `customer-order:${order.id}`
    );
}

async function sendCartReminder(email, itemCount) {
    const store = readTokens();
    const key = String(email || '').trim().toLowerCase();
    const tokens = store.customers[key] || [];
    return sendPush(
        tokens,
        {
            title: 'Items waiting in your cart',
            body: `You have ${itemCount} item(s) in your Aura cart. Complete checkout when ready.`
        },
        { type: 'cart_reminder', email: key },
        `cart-reminder:${key}`
    );
}

module.exports = {
    registerToken,
    notifyAdminsNewOrder,
    notifyCustomerOrderConfirmed,
    sendCartReminder,
    initFirebase,
    readTokens
};
