const fs = require('fs');
const path = require('path');

const TOKENS_FILE = path.join(__dirname, 'data', 'fcm-tokens.json');

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
}

async function sendPush(tokens, notification, data = {}) {
    if (!tokens?.length) return { sent: 0 };
    if (!initFirebase()) {
        console.log('[FCM] Skipping push — set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.');
        return { sent: 0, skipped: true };
    }
    const admin = require('firebase-admin');
    const unique = [...new Set(tokens.filter(Boolean))];
    const res = await admin.messaging().sendEachForMulticast({
        tokens: unique,
        notification,
        data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v ?? '')])
        )
    });
    return { sent: res.successCount, failed: res.failureCount };
}

async function notifyAdminsNewOrder(order) {
    const store = readTokens();
    const total = order.cart?.grandTotal ?? 0;
    return sendPush(
        store.admin,
        {
            title: 'New order received',
            body: `${order.customer?.name || 'Customer'} — ₹${total} (${order.id})`
        },
        { type: 'new_order', orderId: order.id }
    );
}

async function notifyCustomerOrderConfirmed(email, order) {
    const store = readTokens();
    const tokens = store.customers[String(email || '').trim().toLowerCase()] || [];
    return sendPush(
        tokens,
        {
            title: 'Order confirmed',
            body: `Thank you! Order ${order.id} is confirmed. Total ₹${order.cart?.grandTotal ?? 0}.`
        },
        { type: 'order_confirmed', orderId: order.id }
    );
}

async function sendCartReminder(email, itemCount) {
    const store = readTokens();
    const tokens = store.customers[String(email || '').trim().toLowerCase()] || [];
    return sendPush(
        tokens,
        {
            title: 'Items waiting in your cart',
            body: `You have ${itemCount} item(s) in your Aura cart. Complete checkout when ready.`
        },
        { type: 'cart_reminder' }
    );
}

module.exports = {
    registerToken,
    notifyAdminsNewOrder,
    notifyCustomerOrderConfirmed,
    sendCartReminder,
    initFirebase
};
