const fs = require('fs');
const path = require('path');

const TOKENS_FILE = path.join(__dirname, 'data', 'fcm-tokens.json');
const ANDROID_ADMIN_CHANNEL = 'aura_new_orders';
const ANDROID_CUSTOMER_CHANNEL = 'aura_customer_updates';
const ANDROID_PROMO_CHANNEL = 'aura_promotions';

const ORDER_STATUS_LABELS = {
    created: 'Order received',
    confirmed: 'Order confirmed',
    processing: 'Being prepared',
    packed: 'Packed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
};

const CUSTOMER_STATUS_MESSAGES = {
    created: 'We have received your order and will update you soon.',
    confirmed: 'Your order is confirmed and we are getting it ready for you.',
    processing: 'Your gift hamper is being carefully prepared by our team.',
    packed: 'Your order has been packed and is almost ready to ship.',
    shipped: 'Great news — your order is on its way to you!',
    delivered: 'Your order has been delivered. We hope you love it!',
    cancelled: 'Your order has been cancelled. Reply to our email if you have questions.'
};

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

function getCustomerTokens(email) {
    const key = String(email || '').trim().toLowerCase();
    if (!key) return [];
    const store = readTokens();
    return store.customers[key] || [];
}

function getAllCustomerTokens() {
    const store = readTokens();
    const all = Object.values(store.customers || {}).flat();
    return [...new Set(all.filter(Boolean))];
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

function pruneInvalidTokensFromAll(tokensToRemove) {
    if (!tokensToRemove?.length) return;
    const store = readTokens();
    for (const [email, tokens] of Object.entries(store.customers || {})) {
        store.customers[email] = (tokens || []).filter((t) => !tokensToRemove.includes(t));
    }
    writeTokens(store);
    console.log(`[FCM] Pruned ${tokensToRemove.length} invalid customer token(s) from all accounts`);
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
    const customerCount = getAllCustomerTokens().length;
    console.log(
        `[FCM] Registered ${role} token for ${email || 'unknown'} ` +
        `(${token.slice(0, 12)}…) — admin: ${store.admin.length}, customer devices: ${customerCount}`
    );
}

function buildPushPayload(tokens, notification, data, options = {}) {
    const channelId = options.channelId || ANDROID_ADMIN_CHANNEL;
    const imageUrl = String(options.imageUrl || notification.imageUrl || data.imageUrl || '').trim();
    const androidNotification = {
        channelId,
        priority: 'high',
        defaultSound: true,
        notificationCount: 1
    };
    if (imageUrl) androidNotification.imageUrl = imageUrl;

    const notif = {
        title: notification.title,
        body: notification.body
    };
    if (imageUrl) notif.imageUrl = imageUrl;

    return {
        tokens,
        notification: notif,
        data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v ?? '')])
        ),
        android: {
            priority: 'high',
            notification: androidNotification
        }
    };
}

async function sendPush(tokens, notification, data = {}, logContext = 'push', options = {}) {
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
    const payload = buildPushPayload(unique, notification, data, options);

    console.log(
        `[FCM] ${logContext}: sending "${notification.title}" to ${unique.length} device(s) ` +
        `(type=${data.type || '-'}, orderId=${data.orderId || '-'})`
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
        if (logContext.includes('broadcast') || logContext.includes('digest')) {
            pruneInvalidTokensFromAll(invalidTokens);
        } else if (logContext.includes('admin')) {
            pruneInvalidTokens('admin', null, invalidTokens);
        } else {
            pruneInvalidTokens('customer', data.email, invalidTokens);
        }
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
        {
            type: 'new_order',
            orderId,
            title: 'New order received',
            body: `${order.customer?.name || 'Customer'} — ₹${total} (${orderId})`
        },
        `admin-new-order:${orderId}`,
        { channelId: ANDROID_ADMIN_CHANNEL }
    );
}

async function notifyCustomerOrderConfirmed(email, order) {
    const key = String(email || '').trim().toLowerCase();
    const tokens = getCustomerTokens(key);
    const name = order.customer?.name || 'there';
    console.log(`[FCM] Order confirmed ${order.id}: notifying customer ${key || '-'} (${tokens.length} token(s))`);
    return sendPush(
        tokens,
        {
            title: 'Order confirmed',
            body: `Hi ${name}, thank you! Order ${order.id} is confirmed. Total ₹${order.cart?.grandTotal ?? 0}.`
        },
        {
            type: 'order_confirmed',
            orderId: order.id,
            email: key,
            customerName: name,
            title: 'Order confirmed',
            body: `Hi ${name}, thank you! Order ${order.id} is confirmed.`
        },
        `customer-order:${order.id}`,
        { channelId: ANDROID_CUSTOMER_CHANNEL }
    );
}

async function notifyCustomerOrderStatus(order, newStatus, previousStatus) {
    if (!newStatus || newStatus === previousStatus) {
        return { sent: 0, skipped: true, reason: 'unchanged_status' };
    }
    const customer = order.customer || {};
    const email = String(customer.email || order.userEmail || '').trim().toLowerCase();
    const name = String(customer.name || '').trim();
    const tokens = getCustomerTokens(email);
    if (!tokens.length) {
        console.log(`[FCM] Status update ${order.id} → ${newStatus}: no FCM tokens for ${email || 'unknown'}`);
        return { sent: 0, skipped: true, reason: 'no_tokens', email };
    }

    const statusLabel = ORDER_STATUS_LABELS[newStatus] || newStatus;
    const detail = CUSTOMER_STATUS_MESSAGES[newStatus] || `Your order status is now ${statusLabel}.`;
    const greeting = name ? `Hi ${name}, ` : '';
    const body = `${greeting}${detail}`;
    const title = `Order ${statusLabel}`;

    console.log(`[FCM] Status update ${order.id} → ${newStatus}: notifying ${name || email} (${tokens.length} device(s))`);
    return sendPush(
        tokens,
        { title, body },
        {
            type: 'order_status',
            orderId: order.id,
            email,
            customerName: name,
            status: newStatus,
            statusLabel,
            title,
            body
        },
        `customer-status:${order.id}:${newStatus}`,
        { channelId: ANDROID_CUSTOMER_CHANNEL }
    );
}

async function broadcastToCustomers({ title, body, imageUrl, type = 'broadcast' }) {
    const tokens = getAllCustomerTokens();
    const cleanTitle = String(title || '').trim();
    const cleanBody = String(body || '').trim();
    const cleanImage = String(imageUrl || '').trim();
    if (!cleanTitle || !cleanBody) {
        return { sent: 0, skipped: true, reason: 'missing_title_or_body' };
    }
    console.log(`[FCM] Customer broadcast "${cleanTitle}" to ${tokens.length} device(s)`);
    return sendPush(
        tokens,
        { title: cleanTitle, body: cleanBody, imageUrl: cleanImage || undefined },
        {
            type,
            title: cleanTitle,
            body: cleanBody,
            imageUrl: cleanImage
        },
        `customer-broadcast:${type}`,
        { channelId: ANDROID_PROMO_CHANNEL, imageUrl: cleanImage }
    );
}

async function sendNewProductsDigest(products, options = {}) {
    const list = Array.isArray(products) ? products : [];
    const recent = list
        .slice()
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
        .slice(0, 3);
    if (!recent.length) {
        console.log('[FCM] Daily digest: no products to announce');
        return { sent: 0, skipped: true, reason: 'no_products' };
    }

    const names = recent.map((p) => p.name).filter(Boolean);
    const title = options.title || 'New at Aura Boxed Gifts';
    const body = options.body || `Discover ${names.join(', ')} and more curated gifts today.`;
    const imageUrl = options.imageUrl || recent.find((p) => p.image)?.image || '';

    return broadcastToCustomers({
        title,
        body,
        imageUrl,
        type: 'product_digest'
    });
}

async function sendCartReminder(email, itemCount) {
    const key = String(email || '').trim().toLowerCase();
    const tokens = getCustomerTokens(key);
    return sendPush(
        tokens,
        {
            title: 'Items waiting in your cart',
            body: `You have ${itemCount} item(s) in your Aura cart. Complete checkout when ready.`
        },
        { type: 'cart_reminder', email: key },
        `cart-reminder:${key}`,
        { channelId: ANDROID_CUSTOMER_CHANNEL }
    );
}

function getFcmStats() {
    const store = readTokens();
    const customerEmails = Object.keys(store.customers || {}).filter((e) => (store.customers[e] || []).length > 0);
    return {
        adminTokens: (store.admin || []).length,
        customerEmails: customerEmails.length,
        customerDevices: getAllCustomerTokens().length
    };
}

module.exports = {
    registerToken,
    notifyAdminsNewOrder,
    notifyCustomerOrderConfirmed,
    notifyCustomerOrderStatus,
    broadcastToCustomers,
    sendNewProductsDigest,
    sendCartReminder,
    initFirebase,
    readTokens,
    getFcmStats,
    getAllCustomerTokens,
    ORDER_STATUS_LABELS
};
