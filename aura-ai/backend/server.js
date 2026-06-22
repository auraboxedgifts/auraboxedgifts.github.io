const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const nodemailer = require('nodemailer');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config();

const { generateAllPages } = require('./scripts/generate-pages');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is required.');
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    console.warn('WARN: JWT_SECRET is missing. Using fallback secret for this boot only.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-change-me';

function getAdminEmail() {
    return String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
}

function isAdminEmail(email) {
    const adminEmail = getAdminEmail();
    return Boolean(adminEmail) && String(email || '').trim().toLowerCase() === adminEmail;
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    if (!storedHash || !password) return false;
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const test = crypto.scryptSync(password, salt, 64).toString('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
    } catch (err) {
        return false;
    }
}

function sanitizeUser(user, email) {
    if (!user) return null;
    return {
        email: user.email || email,
        name: user.name || '',
        phone: user.phone || '',
        addresses: user.addresses || [],
        checkoutInfo: user.checkoutInfo || null,
        hasPassword: Boolean(user.passwordHash),
        isAdmin: isAdminEmail(user.email || email),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const COLLECTIONS_FILE = path.join(DATA_DIR, 'collections.json');
const SITE_FILE = path.join(DATA_DIR, 'site.json');

const DEFAULT_ABOUT = {
    label: 'Our Story',
    title: 'Crafted with Love, Delivered with Care',
    image: '/images/web/auraboxedgifts.png',
    body: 'Aura Boxed Gifts is a custom gift hamper business that focuses on creating beautifully curated, personalized gift boxes for different occasions.\n\n💝 What we do:\n• Create customized hamper boxes (you can choose items, theme, colors)\n• Design aesthetic packaging with lights, shredded paper, ribbons, etc.\n• Offer occasion-based gifting like Birthdays, Mother\'s Day, Weddings, Anniversaries, and Corporate gifts.\n\nWe provide pan-India delivery and take orders via our website or Instagram DMs! 🎁',
    ctaText: 'Visit Our Store',
    ctaLink: 'https://www.instagram.com/aura_boxedgifts?utm_source=qr&igsh=MTYwbTYzNjJ6anUwdA=='
};

const DEFAULT_SITE = {
    hero: {
        slides: [
            { id: 'hero_1', image: '/images/web/auraboxedgifts.png', alt: 'Aura Boxed Gifts' }
        ]
    },
    hampers: [],
    about: { ...DEFAULT_ABOUT },
    settings: {
        shippingFlatRate: 120
    }
};

const ROOT_DIR = path.resolve(__dirname, '../..');
const IMAGES_DIR = path.join(ROOT_DIR, 'images');
const UPLOADS_DIR = path.join(IMAGES_DIR, 'web');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]');
if (!fs.existsSync(PRODUCTS_FILE)) fs.writeFileSync(PRODUCTS_FILE, '[]');
if (!fs.existsSync(COLLECTIONS_FILE)) fs.writeFileSync(COLLECTIONS_FILE, '[]');
if (!fs.existsSync(SITE_FILE)) fs.writeFileSync(SITE_FILE, JSON.stringify(DEFAULT_SITE, null, 2));

const ALLOWED_IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const uploadStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ALLOWED_IMAGE_EXT.has(ext) ? ext : '.jpg';
        const base = path.basename(file.originalname || 'upload', ext)
            .replace(/[^a-z0-9\-_]+/gi, '-')
            .replace(/(^-|-$)/g, '')
            .toLowerCase()
            .slice(0, 40) || 'upload';
        const stamp = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
        cb(null, `${base}-${stamp}${safeExt}`);
    }
});
const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (!ALLOWED_IMAGE_EXT.has(ext)) {
            return cb(new Error('Only image files (jpg/png/webp/gif/avif) are allowed'));
        }
        cb(null, true);
    }
});

function regenerateCollectionPages() {
    try {
        generateAllPages();
    } catch (err) {
        console.error('Page regeneration failed:', err.message);
    }
}

const app = express();
const PORT = process.env.PORT || 5013;

const allowedOrigins = [
    'http://localhost:8000',
    'http://localhost:5013',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'https://auraboxedgifts.github.io',
    'https://aura.devshubh.me',
    'https://auraboxedgifts.in',
    'https://www.auraboxedgifts.in'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(null, true);
    },
    credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use((req, res, next) => {
    const ts = new Date().toISOString();
    console.log(`[API] ${ts} ${req.method} ${req.path}`);
    next();
});

app.use('/images', express.static(IMAGES_DIR, { maxAge: '7d' }));
app.use('/collections', express.static(path.join(ROOT_DIR, 'collections'), { maxAge: '1h' }));
// Serve the repo root for static assets (style.css, js/, etc.) so collection pages loaded
// from the backend can resolve their relative paths (../style.css, ../js/api.js, etc.)
app.use(express.static(ROOT_DIR, { maxAge: '1h', index: false }));

function readJson(filePath, fallback) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        return fallback;
    }
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function jsonOk(res, data) {
    return res.json({ success: true, data });
}

function jsonErr(res, status, error) {
    return res.status(status).json({ success: false, error });
}

function getToken(req) {
    const bearer = req.headers.authorization;
    if (bearer && bearer.startsWith('Bearer ')) {
        return bearer.slice(7).trim();
    }
    return req.body?.token || null;
}

function requireAuth(req, res, next) {
    const token = getToken(req);
    if (!token) return jsonErr(res, 401, 'Authentication required');
    try {
        req.auth = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return jsonErr(res, 401, 'Invalid token');
    }
}

function requireAdmin(req, res, next) {
    const token = getToken(req);
    if (!token) return jsonErr(res, 401, 'Admin authentication required');
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') return jsonErr(res, 403, 'Admin access required');
        req.admin = decoded;
        next();
    } catch (err) {
        return jsonErr(res, 401, 'Invalid admin token');
    }
}

function getCatalog() {
    return readJson(PRODUCTS_FILE, []);
}

function getSite() {
    const site = readJson(SITE_FILE, DEFAULT_SITE);
    if (!site.hero || !Array.isArray(site.hero.slides)) site.hero = { slides: [] };
    if (!Array.isArray(site.hampers)) site.hampers = [];
    site.about = { ...DEFAULT_ABOUT, ...(site.about || {}) };
    site.settings = { ...DEFAULT_SITE.settings, ...(site.settings || {}) };
    return site;
}

function getSettings() {
    const settings = getSite().settings || DEFAULT_SITE.settings;
    const raw = Number(settings.shippingFlatRate);
    const shippingFlatRate = Number.isFinite(raw) && raw >= 0 ? raw : 120;
    return { shippingFlatRate };
}

function saveSite(site) {
    writeJson(SITE_FILE, site);
}

function getSellable(productId) {
    const products = getCatalog();
    const product = products.find((p) => p.id === productId);
    if (product) return product;
    // Hampers are sellable too — resolve them from the site config
    const hamper = (getSite().hampers || []).find((h) => h.id === productId);
    if (hamper && Number(hamper.price) > 0) {
        return { id: hamper.id, name: hamper.title, image: hamper.image, price: Number(hamper.price) };
    }
    return null;
}

function calculateCart(items) {
    const lines = [];
    let subtotal = 0;
    for (const row of items || []) {
        const qty = Math.max(1, Number(row.qty || 1));
        const product = getSellable(row.productId);
        if (!product) continue;
        const lineTotal = qty * product.price;
        subtotal += lineTotal;
        lines.push({
            productId: product.id,
            name: product.name,
            image: product.image,
            qty,
            unitPrice: product.price,
            lineTotal
        });
    }
    const shipping = lines.length ? getSettings().shippingFlatRate : 0;
    const discount = 0;
    const tax = 0;
    const grandTotal = subtotal + shipping + tax - discount;
    return { lines, subtotal, shipping, discount, tax, grandTotal, currency: 'INR' };
}

const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

async function sendEmailNotification(message, senderInfo = '', inquiryType = 'General', toAddress = null) {
    const to = String(toAddress || process.env.RECIPIENT_EMAIL || '').trim();
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        return { success: false, error: 'Email credentials not configured on server.', to };
    }
    if (!to) {
        return { success: false, error: 'No recipient email configured.', to };
    }
    try {
        const info = await emailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject: `Aura Inquiry - ${inquiryType}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
                    <h2>Aura Boxed Gifts - ${inquiryType}</h2>
                    <p><strong>Message</strong></p>
                    <div>${message}</div>
                    ${senderInfo ? `<p><strong>Sender:</strong> ${senderInfo}</p>` : ''}
                    <p><strong>Received:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                </div>
            `
        });
        return { success: true, messageId: info.messageId, to };
    } catch (error) {
        return { success: false, error: error.message, to };
    }
}

async function sendCustomerOrderEmail(customer, order) {
    if (!customer?.email || !process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) return;
    const lines = order.cart.lines.map((l) => `<li>${l.name} x${l.qty} - ₹${l.lineTotal}</li>`).join('');
    await emailTransporter.sendMail({
        from: `"Aura Boxed Gifts" <${process.env.EMAIL_USER}>`,
        to: customer.email,
        subject: `Your Aura Boxed Gifts order ${order.id} is confirmed`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
                <h2>Thank you for your order, ${customer.name || 'Customer'}!</h2>
                <p>Your payment was successful. Here are your order details:</p>
                <p><strong>Order ID:</strong> ${order.id}</p>
                <ul>${lines}</ul>
                <p><strong>Subtotal:</strong> ₹${order.cart.subtotal}</p>
                <p><strong>Shipping:</strong> ₹${order.cart.shipping}</p>
                <p><strong>Total paid:</strong> ₹${order.cart.grandTotal}</p>
                <p><strong>Shipping address:</strong> ${customer.address || '-'}</p>
                <p>We appreciate you shopping with Aura Boxed Gifts.</p>
            </div>
        `
    });
}

const ORDER_STATUS_LABELS = {
    created: 'Order received',
    confirmed: 'Order confirmed',
    processing: 'Being prepared',
    packed: 'Packed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
};

function resolveOrderCustomer(order) {
    const c = order.customer || {};
    return {
        name: c.name || '',
        email: c.email || order.userEmail || '',
        phone: c.phone || '',
        address: c.address || ''
    };
}

async function sendCustomerStatusUpdateEmail(order, newStatus, previousStatus) {
    if (!newStatus || newStatus === previousStatus) return;
    const customer = resolveOrderCustomer(order);
    if (!customer.email || !process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        console.log('[Email] Skipping status update — no customer email or mail credentials.');
        return;
    }
    const statusLabel = ORDER_STATUS_LABELS[newStatus] || newStatus;
    const lines = (order.cart?.lines || [])
        .map((l) => `<li>${l.name} x${l.qty} - ₹${l.lineTotal}</li>`)
        .join('');
    const statusMessages = {
        created: 'We have received your order and will update you soon.',
        confirmed: 'Your order is confirmed and we are getting it ready for you.',
        processing: 'Your gift hamper is being carefully prepared by our team.',
        packed: 'Your order has been packed and is almost ready to ship.',
        shipped: 'Great news — your order is on its way to you!',
        delivered: 'Your order has been delivered. We hope you love it!',
        cancelled: 'Your order has been cancelled. If you have questions, please reply to this email.'
    };
    const message = statusMessages[newStatus] || `Your order status is now: ${statusLabel}.`;
    try {
        await emailTransporter.sendMail({
            from: `"Aura Boxed Gifts" <${process.env.EMAIL_USER}>`,
            to: customer.email,
            subject: `Aura Boxed Gifts — your order ${order.id} is ${statusLabel.toLowerCase()}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
                    <h2>Hi ${customer.name || 'there'}!</h2>
                    <p>${message}</p>
                    <p><strong>Order ID:</strong> ${order.id}</p>
                    <p><strong>Status:</strong> ${statusLabel}</p>
                    ${lines ? `<ul>${lines}</ul>` : ''}
                    <p><strong>Total:</strong> ₹${order.cart?.grandTotal ?? '-'}</p>
                    ${customer.address ? `<p><strong>Shipping address:</strong> ${customer.address}</p>` : ''}
                    <p>Thank you for shopping with Aura Boxed Gifts 💝</p>
                </div>
            `
        });
        console.log(`[Email] Status update sent to ${customer.email} for ${order.id} (${newStatus})`);
    } catch (err) {
        console.error('[Email] Status update failed:', err.message);
    }
}

async function sendWhatsAppNotification(message) {
    const phone = process.env.CALLMEBOT_PHONE;
    const apiKey = process.env.CALLMEBOT_API_KEY;
    if (!phone || !apiKey) {
        console.log('[WhatsApp] Skipping — CALLMEBOT_PHONE or CALLMEBOT_API_KEY not set.');
        return { success: false, error: 'WhatsApp credentials not configured.' };
    }
    const encoded = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apiKey}`;
    return new Promise((resolve) => {
        https.get(url, (resp) => {
            let body = '';
            resp.on('data', (chunk) => { body += chunk; });
            resp.on('end', () => {
                console.log(`[WhatsApp] Sent notification (status ${resp.statusCode})`);
                resolve({ success: resp.statusCode >= 200 && resp.statusCode < 300 });
            });
        }).on('error', (err) => {
            console.error('[WhatsApp] Notification error:', err.message);
            resolve({ success: false, error: err.message });
        });
    });
}

// OTP store
const otpStore = new Map();

function sendOtpEmail(email, otp, subjectPrefix = '') {
    const subject = `${otp} is your ${subjectPrefix}code`;
    return emailTransporter.sendMail({
        from: `"Aura Boxed Gifts" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 30px auto; text-align: center;">
                <h2>Aura Boxed Gifts</h2>
                <p>Your verification code:</p>
                <p style="font-size: 32px; letter-spacing: 6px; font-weight: bold;">${otp}</p>
                <p>This code expires in 10 minutes.</p>
            </div>
        `
    });
}

function createOtp(email, isResend = false) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + (10 * 60 * 1000);
    otpStore.set(email, { otp, expiresAt });
    sendOtpEmail(email, otp, isResend ? 'new ' : '').catch((err) => {
        console.error('OTP email error:', err.message);
    });
}

// Product APIs
app.get('/api/products', (req, res) => {
    const products = getCatalog();
    if (req.query.featured === 'true') {
        return jsonOk(res, products.slice(0, 8));
    }
    return jsonOk(res, products);
});

app.get('/api/products/:collection', (req, res) => {
    const products = getCatalog().filter((p) => p.collection === req.params.collection);
    return jsonOk(res, products);
});

app.get('/api/products/:collection/:idx', (req, res) => {
    const idx = Math.max(0, Number(req.params.idx));
    const products = getCatalog().filter((p) => p.collection === req.params.collection);
    return jsonOk(res, products[idx] || null);
});

app.get('/api/collections', (req, res) => {
    return jsonOk(res, readJson(COLLECTIONS_FILE, []));
});

// Public site content (hero slides + hampers showcase)
app.get('/api/site', (req, res) => {
    return jsonOk(res, getSite());
});

app.get('/api/settings', (req, res) => {
    return jsonOk(res, getSettings());
});

app.get('/api/admin/settings', requireAdmin, (req, res) => {
    return jsonOk(res, getSettings());
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const site = getSite();
    const rate = Number(req.body?.shippingFlatRate);
    if (!Number.isFinite(rate) || rate < 0) {
        return jsonErr(res, 400, 'shippingFlatRate must be a non-negative number');
    }
    site.settings = { ...(site.settings || {}), shippingFlatRate: Math.round(rate) };
    saveSite(site);
    return jsonOk(res, getSettings());
});

app.get('/api/hampers', (req, res) => {
    return jsonOk(res, getSite().hampers);
});

app.post('/api/admin/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = String(process.env.ADMIN_PASSWORD || '');
    if (!adminEmail || !adminPassword) {
        return jsonErr(res, 500, 'Admin credentials not configured on server');
    }
    if (email !== adminEmail || password !== adminPassword) {
        return jsonErr(res, 401, 'Invalid admin credentials');
    }
    const token = jwt.sign({ role: 'admin', email }, JWT_SECRET, { expiresIn: '12h' });
    return jsonOk(res, { token, email });
});

app.get('/api/admin/products', requireAdmin, (req, res) => {
    return jsonOk(res, getCatalog());
});

app.get('/api/admin/collections', requireAdmin, (req, res) => {
    return jsonOk(res, readJson(COLLECTIONS_FILE, []));
});

function toSlug(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function parseTags(value) {
    if (Array.isArray(value)) return value.map((t) => String(t).trim()).filter(Boolean);
    if (typeof value === 'string') {
        return value.split(',').map((t) => t.trim()).filter(Boolean);
    }
    return [];
}

app.post('/api/admin/products', requireAdmin, (req, res) => {
    const products = getCatalog();
    const payload = req.body || {};
    if (!payload.name || !payload.collection || !payload.image || payload.price === undefined || payload.price === '') {
        return jsonErr(res, 400, 'name, collection, image, and price are required');
    }
    const baseSlug = payload.slug ? toSlug(payload.slug) : toSlug(payload.name);
    let slug = baseSlug || `prod-${Date.now()}`;
    let collision = 1;
    while (products.some((p) => p.slug === slug)) {
        slug = `${baseSlug}-${collision++}`;
    }
    let nextId = payload.id || `prod_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    while (products.some((p) => p.id === nextId)) {
        nextId = `prod_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    }
    const product = {
        id: nextId,
        slug,
        name: String(payload.name).trim(),
        collection: String(payload.collection).trim(),
        price: Number(payload.price) || 0,
        image: String(payload.image),
        description: String(payload.description || ''),
        tags: parseTags(payload.tags)
    };
    products.push(product);
    writeJson(PRODUCTS_FILE, products);
    regenerateCollectionPages();
    return jsonOk(res, product);
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
    const products = getCatalog();
    const idx = products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return jsonErr(res, 404, 'Product not found');
    const allowed = ['slug', 'name', 'collection', 'price', 'image', 'description', 'tags'];
    const next = { ...products[idx] };
    for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
            if (key === 'price') {
                next.price = Number(req.body.price) || 0;
            } else if (key === 'tags') {
                next.tags = parseTags(req.body.tags);
            } else if (key === 'slug') {
                next.slug = toSlug(req.body.slug) || next.slug;
            } else {
                next[key] = String(req.body[key] == null ? '' : req.body[key]);
            }
        }
    }
    products[idx] = next;
    writeJson(PRODUCTS_FILE, products);
    regenerateCollectionPages();
    return jsonOk(res, next);
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    autoSnapshot('Before product delete: ' + req.params.id);
    const products = getCatalog();
    const next = products.filter((p) => p.id !== req.params.id);
    if (next.length === products.length) return jsonErr(res, 404, 'Product not found');
    writeJson(PRODUCTS_FILE, next);
    regenerateCollectionPages();
    return jsonOk(res, { deleted: true });
});

app.post('/api/admin/products/reorder', requireAdmin, (req, res) => {
    const collection = String(req.body?.collection || '').trim();
    const order = Array.isArray(req.body?.order) ? req.body.order : [];
    if (!collection || !order.length) return jsonErr(res, 400, 'collection and order are required');
    const products = getCatalog();
    const inCollection = products.filter((p) => p.collection === collection);
    const others = products.filter((p) => p.collection !== collection);
    const orderedIds = order.filter((id) => inCollection.some((p) => p.id === id));
    const seen = new Set(orderedIds);
    const tail = inCollection.filter((p) => !seen.has(p.id));
    const reordered = orderedIds
        .map((id) => inCollection.find((p) => p.id === id))
        .filter(Boolean)
        .concat(tail);
    writeJson(PRODUCTS_FILE, [...others, ...reordered]);
    regenerateCollectionPages();
    return jsonOk(res, { reordered: reordered.map((p) => p.id) });
});

function getPublicBaseUrl(req) {
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/+$/, '');
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${proto}://${host}`;
}

app.post('/api/admin/upload', requireAdmin, upload.single('image'), (req, res) => {
    if (!req.file) return jsonErr(res, 400, 'No image uploaded');
    const relativePath = `/images/web/${req.file.filename}`;
    // Absolute URL so uploaded images load even when the frontend is hosted on a
    // different origin than this backend (e.g. static site + remote API).
    const absoluteUrl = `${getPublicBaseUrl(req)}${relativePath}`;
    return jsonOk(res, {
        url: relativePath,
        absoluteUrl,
        filename: req.file.filename,
        size: req.file.size
    });
});

app.post('/api/admin/collections', requireAdmin, (req, res) => {
    const collections = readJson(COLLECTIONS_FILE, []);
    const name = String(req.body?.name || '').trim();
    if (!name) return jsonErr(res, 400, 'Collection name is required');
    const slug = toSlug(req.body?.slug || name);
    if (!slug) return jsonErr(res, 400, 'Invalid slug');
    if (collections.some((c) => c.slug === slug)) {
        return jsonErr(res, 409, 'A collection with this slug already exists');
    }
    const collection = {
        slug,
        name,
        description: String(req.body?.description || ''),
        image: String(req.body?.image || '')
    };
    collections.push(collection);
    writeJson(COLLECTIONS_FILE, collections);
    regenerateCollectionPages();
    return jsonOk(res, collection);
});

app.put('/api/admin/collections/:slug', requireAdmin, (req, res) => {
    const collections = readJson(COLLECTIONS_FILE, []);
    const idx = collections.findIndex((c) => c.slug === req.params.slug);
    if (idx === -1) return jsonErr(res, 404, 'Collection not found');
    const next = { ...collections[idx] };
    if (typeof req.body?.name === 'string' && req.body.name.trim()) {
        next.name = req.body.name.trim();
    }
    if (typeof req.body?.description === 'string') {
        next.description = req.body.description;
    }
    if (typeof req.body?.image === 'string') {
        next.image = req.body.image;
    }
    collections[idx] = next;
    writeJson(COLLECTIONS_FILE, collections);
    regenerateCollectionPages();
    return jsonOk(res, next);
});

app.delete('/api/admin/collections/:slug', requireAdmin, (req, res) => {
    autoSnapshot('Before collection delete: ' + req.params.slug);
    const collections = readJson(COLLECTIONS_FILE, []);
    const slug = req.params.slug;
    const next = collections.filter((c) => c.slug !== slug);
    if (next.length === collections.length) return jsonErr(res, 404, 'Collection not found');
    writeJson(COLLECTIONS_FILE, next);
    // If force=1, also delete all products in this collection
    if (req.query.force) {
        const products = getCatalog();
        writeJson(PRODUCTS_FILE, products.filter((p) => p.collection !== slug));
    }
    regenerateCollectionPages();
    return jsonOk(res, { deleted: true, productsRemoved: Boolean(req.query.force) });
});

app.post('/api/admin/collections/reorder', requireAdmin, (req, res) => {
    const { order } = req.body;
    if (!Array.isArray(order)) return jsonErr(res, 400, 'order must be an array of slugs');
    const collections = readJson(COLLECTIONS_FILE, []);
    const bySlug = Object.fromEntries(collections.map((c) => [c.slug, c]));
    const reordered = order.map((slug) => bySlug[slug]).filter(Boolean);
    // Append any collections not mentioned in the order array
    const mentioned = new Set(order);
    collections.forEach((c) => { if (!mentioned.has(c.slug)) reordered.push(c); });
    writeJson(COLLECTIONS_FILE, reordered);
    regenerateCollectionPages();
    return jsonOk(res, reordered);
});

app.post('/api/admin/regenerate-pages', requireAdmin, (req, res) => {
    try {
        const generated = generateAllPages();
        return jsonOk(res, { generated });
    } catch (err) {
        return jsonErr(res, 500, err.message);
    }
});

// ─── Admin: Homepage content (hero slides + hampers) ───
app.get('/api/admin/site', requireAdmin, (req, res) => {
    return jsonOk(res, getSite());
});

// Hero slides
app.post('/api/admin/hero', requireAdmin, (req, res) => {
    const site = getSite();
    const image = String(req.body?.image || '').trim();
    if (!image) return jsonErr(res, 400, 'Image is required');
    const slide = {
        id: `hero_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        image,
        alt: String(req.body?.alt || 'Aura Boxed Gifts')
    };
    site.hero.slides.push(slide);
    saveSite(site);
    return jsonOk(res, slide);
});

app.put('/api/admin/hero/:id', requireAdmin, (req, res) => {
    const site = getSite();
    const idx = site.hero.slides.findIndex((s) => s.id === req.params.id);
    if (idx === -1) return jsonErr(res, 404, 'Hero slide not found');
    if (typeof req.body?.image === 'string' && req.body.image.trim()) {
        site.hero.slides[idx].image = req.body.image.trim();
    }
    if (typeof req.body?.alt === 'string') {
        site.hero.slides[idx].alt = req.body.alt;
    }
    saveSite(site);
    return jsonOk(res, site.hero.slides[idx]);
});

app.delete('/api/admin/hero/:id', requireAdmin, (req, res) => {
    const site = getSite();
    const next = site.hero.slides.filter((s) => s.id !== req.params.id);
    if (next.length === site.hero.slides.length) return jsonErr(res, 404, 'Hero slide not found');
    if (!next.length) return jsonErr(res, 400, 'At least one hero slide is required');
    site.hero.slides = next;
    saveSite(site);
    return jsonOk(res, { deleted: true });
});

app.post('/api/admin/hero/reorder', requireAdmin, (req, res) => {
    const site = getSite();
    const order = Array.isArray(req.body?.order) ? req.body.order : [];
    const map = new Map(site.hero.slides.map((s) => [s.id, s]));
    const reordered = order.map((id) => map.get(id)).filter(Boolean);
    const tail = site.hero.slides.filter((s) => !order.includes(s.id));
    site.hero.slides = [...reordered, ...tail];
    saveSite(site);
    return jsonOk(res, site.hero.slides);
});

// Hampers showcase
app.post('/api/admin/hampers', requireAdmin, (req, res) => {
    const site = getSite();
    const title = String(req.body?.title || '').trim();
    const image = String(req.body?.image || '').trim();
    if (!title || !image) return jsonErr(res, 400, 'Title and image are required');
    const hamper = {
        id: `hamper_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        title,
        subtitle: String(req.body?.subtitle || 'Customised'),
        image,
        price: Math.max(0, Number(req.body?.price) || 0)
    };
    site.hampers.push(hamper);
    saveSite(site);
    return jsonOk(res, hamper);
});

app.put('/api/admin/hampers/:id', requireAdmin, (req, res) => {
    const site = getSite();
    const idx = site.hampers.findIndex((h) => h.id === req.params.id);
    if (idx === -1) return jsonErr(res, 404, 'Hamper not found');
    const next = { ...site.hampers[idx] };
    if (typeof req.body?.title === 'string' && req.body.title.trim()) next.title = req.body.title.trim();
    if (typeof req.body?.subtitle === 'string') next.subtitle = req.body.subtitle;
    if (typeof req.body?.image === 'string' && req.body.image.trim()) next.image = req.body.image.trim();
    if (req.body?.price !== undefined && req.body.price !== '') next.price = Math.max(0, Number(req.body.price) || 0);
    site.hampers[idx] = next;
    saveSite(site);
    return jsonOk(res, next);
});

app.delete('/api/admin/hampers/:id', requireAdmin, (req, res) => {
    const site = getSite();
    const next = site.hampers.filter((h) => h.id !== req.params.id);
    if (next.length === site.hampers.length) return jsonErr(res, 404, 'Hamper not found');
    site.hampers = next;
    saveSite(site);
    return jsonOk(res, { deleted: true });
});

app.post('/api/admin/hampers/reorder', requireAdmin, (req, res) => {
    const site = getSite();
    const order = Array.isArray(req.body?.order) ? req.body.order : [];
    const map = new Map(site.hampers.map((h) => [h.id, h]));
    const reordered = order.map((id) => map.get(id)).filter(Boolean);
    const tail = site.hampers.filter((h) => !order.includes(h.id));
    site.hampers = [...reordered, ...tail];
    saveSite(site);
    return jsonOk(res, site.hampers);
});

// About section (homepage "Our Story")
app.put('/api/admin/about', requireAdmin, (req, res) => {
    const site = getSite();
    const about = { ...DEFAULT_ABOUT, ...(site.about || {}) };
    const fields = ['label', 'title', 'body', 'image', 'ctaText', 'ctaLink'];
    for (const key of fields) {
        if (typeof req.body?.[key] === 'string') about[key] = req.body[key];
    }
    site.about = about;
    saveSite(site);
    return jsonOk(res, about);
});

// ─── Admin: Integrations & testing tools ───
function maskValue(value) {
    const v = String(value || '');
    if (!v) return '';
    if (v.length <= 4) return '••••';
    return `${v.slice(0, 2)}••••${v.slice(-2)}`;
}

app.get('/api/admin/integrations', requireAdmin, (req, res) => {
    return jsonOk(res, {
        email: {
            configured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD),
            sender: maskValue(process.env.EMAIL_USER),
            recipient: maskValue(process.env.RECIPIENT_EMAIL)
        },
        whatsapp: {
            configured: Boolean(process.env.CALLMEBOT_PHONE && process.env.CALLMEBOT_API_KEY),
            phone: maskValue(process.env.CALLMEBOT_PHONE)
        },
        razorpay: {
            configured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
        },
        maps: {
            configured: Boolean(process.env.GOOGLE_MAPS_API_KEY)
        }
    });
});

app.post('/api/admin/test-email', requireAdmin, async (req, res) => {
    const to = String(req.body?.to || process.env.RECIPIENT_EMAIL || '').trim();
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        return jsonErr(res, 400, 'Email is not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD on the server.');
    }
    if (!to) return jsonErr(res, 400, 'No recipient. Provide an address or set RECIPIENT_EMAIL on the server.');
    try {
        const info = await emailTransporter.sendMail({
            from: `"Aura Boxed Gifts" <${process.env.EMAIL_USER}>`,
            to,
            subject: 'Aura test email ✅',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color:#b76e79;">Your email setup works! 🎉</h2>
                    <p>This is a test message sent from the Aura admin panel.</p>
                    <p>If you can read this, order confirmation emails will be delivered correctly.</p>
                    <p style="color:#888;font-size:12px;">Sent: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                </div>`
        });
        return jsonOk(res, { sentTo: to, messageId: info.messageId });
    } catch (err) {
        return jsonErr(res, 500, `Email failed: ${err.message}`);
    }
});

app.post('/api/admin/test-whatsapp', requireAdmin, async (req, res) => {
    if (!process.env.CALLMEBOT_PHONE || !process.env.CALLMEBOT_API_KEY) {
        return jsonErr(res, 400, 'WhatsApp is not configured. Set CALLMEBOT_PHONE and CALLMEBOT_API_KEY on the server.');
    }
    const result = await sendWhatsAppNotification(
        `✅ *Aura test message*\n\nYour WhatsApp order alerts are working. You will receive a message like this whenever a new order comes in.\n\nSent: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
    );
    if (!result.success) return jsonErr(res, 500, `WhatsApp failed: ${result.error || 'Unknown error'}`);
    return jsonOk(res, { sent: true });
});

// Create a ₹1 test order that runs the full order flow (record + emails + WhatsApp)
app.post('/api/admin/test-order', requireAdmin, async (req, res) => {
    const body = req.body || {};
    const amount = Math.max(1, Number(body.amount) || 1);
    const customerEmail = String(body.email || '').trim();
    if (!customerEmail) {
        return jsonErr(res, 400, 'Customer email is required for test orders.');
    }
    const customer = {
        name: String(body.name || 'Test Customer').trim(),
        email: customerEmail,
        phone: String(body.phone || '').trim(),
        address: String(body.address || 'Test address, India').trim(),
        city: String(body.city || '').trim(),
        state: String(body.state || '').trim(),
        pincode: String(body.pincode || '').trim()
    };
    const cart = {
        lines: [{
            productId: 'test_item',
            name: String(body.itemName || 'Test Order Item'),
            image: '',
            qty: 1,
            unitPrice: amount,
            lineTotal: amount
        }],
        subtotal: amount,
        shipping: 0,
        discount: 0,
        tax: 0,
        grandTotal: amount,
        currency: 'INR'
    };

    const orders = readJson(ORDERS_FILE, []);
    const order = {
        id: `test_${Date.now()}`,
        userEmail: customer.email,
        customer,
        cart,
        paymentStatus: 'paid',
        status: 'confirmed',
        isTest: true,
        createdAt: new Date().toISOString()
    };
    orders.unshift(order);
    writeJson(ORDERS_FILE, orders);

    const results = {
        order: order.id,
        adminEmail: null,
        adminEmailTo: customer.email,
        customerEmail: null,
        customerEmailTo: customer.email,
        whatsapp: null,
        fcm: null
    };

    const lineHtml = cart.lines.map((l) => `- ${l.name} x${l.qty}: ₹${l.lineTotal}`).join('<br>');
    try {
        const r = await sendEmailNotification(
            `🧪 TEST ORDER (not a real purchase).<br><strong>Order:</strong> ${order.id}<br><br>${lineHtml}<br><br>Total: ₹${cart.grandTotal}`,
            `${customer.name} (${customer.email})`,
            'Order Request',
            customer.email
        );
        results.adminEmail = r.success ? `sent to ${r.to}` : (r.error || 'failed');
    } catch (err) { results.adminEmail = err.message; }

    try {
        await sendCustomerOrderEmail(customer, order);
        results.customerEmail = `sent to ${customer.email}`;
    } catch (err) { results.customerEmail = err.message; }

    const waMessage = `🧪 *TEST ORDER* (not real)\n\n` +
        `*Order ID:* ${order.id}\n` +
        `*Customer:* ${customer.name || '-'}\n` +
        `*Phone:* ${customer.phone || '-'}\n` +
        `*Email:* ${customer.email || '-'}\n\n` +
        `*Items:*\n• ${cart.lines[0].name} x1: ₹${cart.grandTotal}\n\n` +
        `*Total:* ₹${cart.grandTotal}\n\n` +
        `*Address:*\n${customer.address || '-'}`;
    try {
        const r = await sendWhatsAppNotification(waMessage);
        results.whatsapp = r.success ? 'sent' : (r.error || 'not configured');
    } catch (err) { results.whatsapp = err.message; }

    try {
        const { notifyAdminsNewOrder } = require('./fcm');
        results.fcm = await notifyAdminsNewOrder(order);
    } catch (err) {
        results.fcm = { error: err.message };
        console.error('[FCM] Test order admin notify failed:', err.message);
    }

    return jsonOk(res, results);
});

// ─── Snapshot / Rollback System ───
const SNAPSHOTS_DIR = path.join(__dirname, 'data', 'snapshots');
if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
const MAX_SNAPSHOTS = 20;

function createSnapshot(label) {
    const id = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const dir = path.join(SNAPSHOTS_DIR, id);
    fs.mkdirSync(dir, { recursive: true });
    // Copy data files
    ['products.json', 'collections.json', 'site.json'].forEach((f) => {
        const src = path.join(__dirname, 'data', f);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, f));
    });
    // Write metadata
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
        id, label: label || 'Manual snapshot',
        createdAt: new Date().toISOString(),
        productCount: getCatalog().length,
        collectionCount: readJson(COLLECTIONS_FILE, []).length
    }, null, 2));
    // Prune old snapshots
    const all = listSnapshots();
    if (all.length > MAX_SNAPSHOTS) {
        const toRemove = all.slice(MAX_SNAPSHOTS);
        toRemove.forEach((s) => {
            const d = path.join(SNAPSHOTS_DIR, s.id);
            if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
        });
    }
    return id;
}

function listSnapshots() {
    if (!fs.existsSync(SNAPSHOTS_DIR)) return [];
    const dirs = fs.readdirSync(SNAPSHOTS_DIR).filter((d) => {
        return fs.statSync(path.join(SNAPSHOTS_DIR, d)).isDirectory();
    });
    const metas = dirs.map((d) => {
        const metaFile = path.join(SNAPSHOTS_DIR, d, 'meta.json');
        if (!fs.existsSync(metaFile)) return null;
        try { return JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch (e) { return null; }
    }).filter(Boolean);
    metas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return metas;
}

function restoreSnapshot(id) {
    const dir = path.join(SNAPSHOTS_DIR, id);
    if (!fs.existsSync(dir)) throw new Error('Snapshot not found');
    ['products.json', 'collections.json', 'site.json'].forEach((f) => {
        const src = path.join(dir, f);
        const dest = path.join(__dirname, 'data', f);
        if (fs.existsSync(src)) fs.copyFileSync(src, dest);
    });
}

// Auto-snapshot helper — called before destructive ops
function autoSnapshot(label) {
    try { createSnapshot(label); } catch (e) { console.error('[Snapshot] auto-snapshot failed:', e.message); }
}

app.post('/api/admin/snapshot', requireAdmin, (req, res) => {
    const label = String(req.body?.label || 'Manual snapshot');
    const id = createSnapshot(label);
    return jsonOk(res, { id, label });
});

app.get('/api/admin/snapshots', requireAdmin, (req, res) => {
    return jsonOk(res, listSnapshots());
});

app.post('/api/admin/restore/:id', requireAdmin, (req, res) => {
    try {
        // Create a snapshot of current state before restoring
        createSnapshot('Auto-backup before restore');
        restoreSnapshot(req.params.id);
        regenerateCollectionPages();
        return jsonOk(res, { restored: req.params.id });
    } catch (err) {
        return jsonErr(res, 400, err.message);
    }
});

app.delete('/api/admin/snapshots/:id', requireAdmin, (req, res) => {
    const dir = path.join(SNAPSHOTS_DIR, req.params.id);
    if (!fs.existsSync(dir)) return jsonErr(res, 404, 'Snapshot not found');
    fs.rmSync(dir, { recursive: true, force: true });
    return jsonOk(res, { deleted: req.params.id });
});

// ─── GitHub Auto-Publish ───
const { execSync } = require('child_process');

app.post('/api/admin/publish', requireAdmin, (req, res) => {
    try {
        // The repo root is two levels up from this backend directory
        const repoRoot = path.resolve(__dirname, '..', '..');
        const gitExists = fs.existsSync(path.join(repoRoot, '.git'));
        if (!gitExists) return jsonErr(res, 500, 'No git repository found at project root');

        // Create a snapshot before publishing
        autoSnapshot('Pre-publish backup');

        // Regenerate collection pages
        regenerateCollectionPages();

        // Stage, commit, and push
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const commitMsg = `admin: publish changes ${timestamp}`;
        try {
            // Ensure git identity is configured
            try { execSync('git config user.email', { cwd: repoRoot, timeout: 3000 }); } catch (_) {
                execSync('git config user.email "admin@auraboxedgifts.in"', { cwd: repoRoot, timeout: 3000 });
                execSync('git config user.name "Aura Admin"', { cwd: repoRoot, timeout: 3000 });
            }
            execSync('git add -A', { cwd: repoRoot, timeout: 15000 });
            // Check if there are changes to commit
            const status = execSync('git status --porcelain', { cwd: repoRoot, timeout: 5000 }).toString().trim();
            if (!status) {
                return jsonOk(res, { message: 'No changes to publish', pushed: false });
            }
            execSync(`git commit -m "${commitMsg}"`, { cwd: repoRoot, timeout: 15000 });
            
            let pushCmd = 'git push origin main';
            if (process.env.GITHUB_TOKEN) {
                try {
                    const remoteUrl = execSync('git remote get-url origin', { cwd: repoRoot }).toString().trim();
                    if (remoteUrl.startsWith('https://')) {
                        const authUrl = remoteUrl.replace('https://', `https://${process.env.GITHUB_TOKEN}@`);
                        pushCmd = `git push "${authUrl}" main`;
                    }
                } catch (remoteErr) {
                    console.error('[Admin] Failed to rewrite remote URL for GITHUB_TOKEN:', remoteErr.message);
                }
            }
            execSync(pushCmd, { cwd: repoRoot, timeout: 30000 });
            console.log(`[Admin] Published changes: ${commitMsg}`);
            return jsonOk(res, { message: 'Published successfully', pushed: true, commit: commitMsg });
        } catch (gitErr) {
            console.error('[Admin] Git publish error:', gitErr.message);
            let errMsg = gitErr.message;
            if (errMsg.includes('could not read Username') || errMsg.includes('Authentication failed')) {
                errMsg = 'Git authentication credentials are not set on the server. Please add GITHUB_TOKEN=your_token to your aura-ai/backend/.env file or configure SSH keys on the server.';
            }
            return jsonErr(res, 500, `Git publish failed: ${errMsg.slice(0, 300)}`);
        }
    } catch (err) {
        return jsonErr(res, 500, err.message);
    }
});

app.post('/api/cart/calculate', (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    return jsonOk(res, calculateCart(items));
});

// Auth APIs
app.post('/api/auth/check-email', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return jsonErr(res, 400, 'Email is required');
    const users = readJson(USERS_FILE, {});
    const user = users[email];
    return jsonOk(res, {
        exists: Boolean(user),
        hasPassword: Boolean(user?.passwordHash),
        isAdmin: isAdminEmail(email)
    });
});

app.post('/api/auth/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) return jsonErr(res, 400, 'Email and password required');
    const users = readJson(USERS_FILE, {});
    const user = users[email];
    if (!user?.passwordHash) return jsonErr(res, 400, 'No password set for this account. Use OTP login first.');
    if (!verifyPassword(password, user.passwordHash)) return jsonErr(res, 401, 'Invalid email or password');
    const token = jwt.sign({ email, role: isAdminEmail(email) ? 'admin' : 'user' }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ success: true, token, email, user: sanitizeUser(user, email) });
});

app.post('/api/auth/set-password', requireAuth, (req, res) => {
    const password = String(req.body?.password || '');
    if (password.length < 6) return jsonErr(res, 400, 'Password must be at least 6 characters');
    const users = readJson(USERS_FILE, {});
    const email = req.auth.email;
    const user = users[email];
    if (!user) return jsonErr(res, 404, 'User not found');
    user.passwordHash = hashPassword(password);
    // Accept optional name during initial password setup (sign-up flow)
    const name = String(req.body?.name || '').trim();
    if (name) user.name = name;
    user.updatedAt = new Date().toISOString();
    users[email] = user;
    writeJson(USERS_FILE, users);
    return jsonOk(res, sanitizeUser(user, email));
});

// Forgot Password — verify OTP and set new password in one step
app.post('/api/auth/reset-password', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const otp = String(req.body?.otp || '');
    const newPassword = String(req.body?.newPassword || '');
    if (!email || !otp || !newPassword) return jsonErr(res, 400, 'Email, OTP, and new password required');
    if (newPassword.length < 6) return jsonErr(res, 400, 'Password must be at least 6 characters');
    const record = otpStore.get(email);
    if (!record) return jsonErr(res, 400, 'No OTP requested for this email');
    if (Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return jsonErr(res, 400, 'OTP has expired');
    }
    if (record.otp !== otp) return jsonErr(res, 400, 'Invalid OTP');
    otpStore.delete(email);
    const users = readJson(USERS_FILE, {});
    const user = users[email];
    if (!user) return jsonErr(res, 404, 'No account found for this email');
    user.passwordHash = hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();
    users[email] = user;
    writeJson(USERS_FILE, users);
    const token = jwt.sign({ email, role: isAdminEmail(email) ? 'admin' : 'user' }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ success: true, token, email, user: sanitizeUser(user, email) });
});

async function handleSendOtp(req, res) {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return jsonErr(res, 400, 'Email is required');
    createOtp(email, false);
    return res.json({ success: true, message: 'OTP sent successfully' });
}
app.post('/api/auth/send-otp', handleSendOtp);
app.post('/api/send-otp', handleSendOtp);

async function handleResendOtp(req, res) {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return jsonErr(res, 400, 'Email is required');
    createOtp(email, true);
    return res.json({ success: true, message: 'OTP resent successfully' });
}
app.post('/api/auth/resend-otp', handleResendOtp);
app.post('/api/resend-otp', handleResendOtp);

function handleVerifyOtp(req, res) {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const otp = String(req.body?.otp || '');
    if (!email || !otp) return jsonErr(res, 400, 'Email and OTP required');
    const record = otpStore.get(email);
    if (!record) return jsonErr(res, 400, 'No OTP requested for this email');
    if (Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return jsonErr(res, 400, 'OTP has expired');
    }
    if (record.otp !== otp) return jsonErr(res, 400, 'Invalid OTP');
    otpStore.delete(email);

    const users = readJson(USERS_FILE, {});
    if (!users[email]) {
        users[email] = {
            email,
            name: '',
            phone: '',
            addresses: [],
            checkoutInfo: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        writeJson(USERS_FILE, users);
    }
    const needsPasswordSetup = !users[email].passwordHash;
    const token = jwt.sign({ email, role: isAdminEmail(email) ? 'admin' : 'user' }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({
        success: true,
        token,
        email,
        needsPasswordSetup,
        user: sanitizeUser(users[email], email)
    });
}
app.post('/api/auth/verify-otp', handleVerifyOtp);
app.post('/api/verify-otp', handleVerifyOtp);

app.post('/api/verify-token', (req, res) => {
    const token = getToken(req);
    if (!token) return jsonErr(res, 400, 'No token provided');
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return res.json({ success: true, email: decoded.email });
    } catch (err) {
        return jsonErr(res, 401, 'Invalid token');
    }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    const users = readJson(USERS_FILE, {});
    const user = users[req.auth.email];
    return jsonOk(res, sanitizeUser(user, req.auth.email));
});

app.put('/api/auth/profile', requireAuth, (req, res) => {
    const users = readJson(USERS_FILE, {});
    const email = req.auth.email;
    const user = users[email] || { email, addresses: [], createdAt: new Date().toISOString() };
    user.name = String(req.body?.name || user.name || '');
    user.phone = String(req.body?.phone || user.phone || '');
    user.updatedAt = new Date().toISOString();
    users[email] = user;
    writeJson(USERS_FILE, users);
    return jsonOk(res, sanitizeUser(user, email));
});

app.delete('/api/auth/account', requireAuth, (req, res) => {
    const users = readJson(USERS_FILE, {});
    const email = req.auth.email;
    if (!users[email]) return jsonErr(res, 404, 'User not found');
    delete users[email];
    writeJson(USERS_FILE, users);
    const orders = readJson(ORDERS_FILE, []);
    const filtered = orders.filter((o) => o.userEmail !== email);
    if (filtered.length !== orders.length) {
        writeJson(ORDERS_FILE, filtered);
    }
    return jsonOk(res, { deleted: true });
});

app.get('/api/auth/checkout-info', requireAuth, (req, res) => {
    const users = readJson(USERS_FILE, {});
    const user = users[req.auth.email] || null;
    return jsonOk(res, user?.checkoutInfo || null);
});

app.put('/api/auth/checkout-info', requireAuth, (req, res) => {
    const users = readJson(USERS_FILE, {});
    const email = req.auth.email;
    const user = users[email] || { email, addresses: [], createdAt: new Date().toISOString() };
    const payload = {
        name: String(req.body?.name || user.checkoutInfo?.name || ''),
        phone: String(req.body?.phone || user.checkoutInfo?.phone || ''),
        address: String(req.body?.address || user.checkoutInfo?.address || ''),
        city: String(req.body?.city || user.checkoutInfo?.city || ''),
        state: String(req.body?.state || user.checkoutInfo?.state || ''),
        pincode: String(req.body?.pincode || user.checkoutInfo?.pincode || '')
    };
    user.checkoutInfo = payload;
    if (!user.name && payload.name) user.name = payload.name;
    if (!user.phone && payload.phone) user.phone = payload.phone;
    user.updatedAt = new Date().toISOString();
    users[email] = user;
    writeJson(USERS_FILE, users);
    return jsonOk(res, payload);
});

// ─── Delete Account ───
app.delete('/api/auth/account', requireAuth, (req, res) => {
    const users = readJson(USERS_FILE, {});
    const email = req.auth.email;
    if (!users[email]) return jsonErr(res, 404, 'Account not found');
    // Anonymize orders but keep order data for admin
    const orders = readJson(ORDERS_FILE, []);
    orders.forEach(o => {
        if (o.userEmail === email || (o.customer && o.customer.email === email)) {
            o.userEmail = '[deleted]';
            if (o.customer) {
                o.customer.name = '[Deleted Account]';
                o.customer.email = '[deleted]';
            }
        }
    });
    writeJson(ORDERS_FILE, orders);
    delete users[email];
    writeJson(USERS_FILE, users);
    console.log(`[Auth] Account deleted: ${email}`);
    return jsonOk(res, { deleted: true });
});

app.get('/api/auth/addresses', requireAuth, (req, res) => {
    const users = readJson(USERS_FILE, {});
    return jsonOk(res, users[req.auth.email]?.addresses || []);
});

app.post('/api/auth/addresses', requireAuth, (req, res) => {
    const users = readJson(USERS_FILE, {});
    const email = req.auth.email;
    const user = users[email] || { email, addresses: [], createdAt: new Date().toISOString() };
    const addr = {
        id: crypto.randomUUID(),
        label: String(req.body?.label || 'Home'),
        addressLine: String(req.body?.addressLine || ''),
        city: String(req.body?.city || ''),
        state: String(req.body?.state || ''),
        pincode: String(req.body?.pincode || ''),
        isDefault: Boolean(req.body?.isDefault)
    };
    if (!addr.addressLine || !addr.city || !addr.pincode) return jsonErr(res, 400, 'Incomplete address');
    user.addresses = user.addresses || [];
    if (addr.isDefault) {
        user.addresses = user.addresses.map((a) => ({ ...a, isDefault: false }));
    }
    user.addresses.push(addr);
    user.updatedAt = new Date().toISOString();
    users[email] = user;
    writeJson(USERS_FILE, users);
    return jsonOk(res, addr);
});

app.put('/api/auth/addresses/:id', requireAuth, (req, res) => {
    const users = readJson(USERS_FILE, {});
    const user = users[req.auth.email];
    if (!user) return jsonErr(res, 404, 'User not found');
    const idx = (user.addresses || []).findIndex((a) => a.id === req.params.id);
    if (idx === -1) return jsonErr(res, 404, 'Address not found');
    user.addresses[idx] = { ...user.addresses[idx], ...req.body };
    if (req.body?.isDefault) {
        user.addresses = user.addresses.map((a, i) => ({ ...a, isDefault: i === idx }));
    }
    user.updatedAt = new Date().toISOString();
    users[req.auth.email] = user;
    writeJson(USERS_FILE, users);
    return jsonOk(res, user.addresses[idx]);
});

app.delete('/api/auth/addresses/:id', requireAuth, (req, res) => {
    const users = readJson(USERS_FILE, {});
    const user = users[req.auth.email];
    if (!user) return jsonErr(res, 404, 'User not found');
    user.addresses = (user.addresses || []).filter((a) => a.id !== req.params.id);
    user.updatedAt = new Date().toISOString();
    users[req.auth.email] = user;
    writeJson(USERS_FILE, users);
    return jsonOk(res, { deleted: true });
});

app.post('/api/get-user-info', (req, res) => {
    const token = getToken(req);
    if (!token) return jsonErr(res, 400, 'No token');
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const users = readJson(USERS_FILE, {});
        return res.json({ success: true, data: users[decoded.email] || null });
    } catch (err) {
        return jsonErr(res, 401, 'Invalid token');
    }
});

app.post('/api/save-user-info', (req, res) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    if (!email) return jsonErr(res, 400, 'Email required');
    const users = readJson(USERS_FILE, {});
    users[email] = { ...(users[email] || {}), ...req.body, email, updatedAt: new Date().toISOString() };
    if (!users[email].createdAt) users[email].createdAt = new Date().toISOString();
    if (!Array.isArray(users[email].addresses)) users[email].addresses = [];
    if (!users[email].checkoutInfo) users[email].checkoutInfo = null;
    writeJson(USERS_FILE, users);
    return res.json({ success: true, message: 'User info saved' });
});

// Orders + payments
let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
}

app.post('/api/orders', requireAuth, (req, res) => {
    const cart = calculateCart(req.body?.items || []);
    if (!cart.lines.length) return jsonErr(res, 400, 'Cart is empty');
    const orders = readJson(ORDERS_FILE, []);
    const order = {
        id: `ord_${Date.now()}`,
        userEmail: req.auth.email,
        status: 'created',
        cart,
        shippingAddress: req.body?.shippingAddress || null,
        paymentStatus: 'pending',
        createdAt: new Date().toISOString()
    };
    orders.unshift(order);
    writeJson(ORDERS_FILE, orders);
    return jsonOk(res, order);
});

app.get('/api/orders', requireAuth, (req, res) => {
    const orders = readJson(ORDERS_FILE, []);
    return jsonOk(res, orders.filter((o) => o.userEmail === req.auth.email));
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
    const orders = readJson(ORDERS_FILE, []);
    const sorted = orders.slice().sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return tb - ta;
    });
    return jsonOk(res, sorted);
});

app.get('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const orders = readJson(ORDERS_FILE, []);
    const order = orders.find((o) => o.id === req.params.id);
    if (!order) return jsonErr(res, 404, 'Order not found');
    return jsonOk(res, order);
});

app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    const orders = readJson(ORDERS_FILE, []);
    const idx = orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) return jsonErr(res, 404, 'Order not found');
    const allowed = ['created', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'];
    const status = String(req.body?.status || '').trim();
    if (status && !allowed.includes(status)) {
        return jsonErr(res, 400, `Invalid status. Allowed: ${allowed.join(', ')}`);
    }
    const previousStatus = orders[idx].status;
    if (status) orders[idx].status = status;
    if (req.body?.notes !== undefined) orders[idx].notes = String(req.body.notes || '');
    orders[idx].updatedAt = new Date().toISOString();
    writeJson(ORDERS_FILE, orders);
    const updated = orders[idx];
    if (status && status !== previousStatus) {
        sendCustomerStatusUpdateEmail(updated, status, previousStatus).catch((err) => {
            console.error('[Email] Status update error:', err.message);
        });
        const { notifyCustomerOrderStatus } = require('./fcm');
        notifyCustomerOrderStatus(updated, status, previousStatus)
            .then((r) => console.log(`[FCM] Customer status push for ${updated.id}:`, JSON.stringify(r)))
            .catch((err) => console.error('[FCM] Customer status push failed:', err.message));
    }
    return jsonOk(res, updated);
});

app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const orders = readJson(ORDERS_FILE, []);
    const idx = orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) return jsonErr(res, 404, 'Order not found');
    const [removed] = orders.splice(idx, 1);
    writeJson(ORDERS_FILE, orders);
    console.log(`[Orders] Deleted order ${removed.id}`);
    return jsonOk(res, { deleted: true, id: removed.id });
});

app.post('/api/create-order', async (req, res) => {
    if (!razorpayInstance) return jsonErr(res, 500, 'Razorpay keys not configured on server.');
    const fromItems = Array.isArray(req.body?.items) ? calculateCart(req.body.items).grandTotal : 0;
    const amount = Number(req.body?.amount || fromItems);
    if (!amount || amount <= 0) return jsonErr(res, 400, 'Invalid amount');
    try {
        const order = await razorpayInstance.orders.create({
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `receipt_${Date.now()}`
        });
        return res.json({ success: true, order, key_id: process.env.RAZORPAY_KEY_ID });
    } catch (err) {
        return jsonErr(res, 500, err.message);
    }
});

app.post('/api/verify-payment', async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            cartItems,
            customer
        } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return jsonErr(res, 400, 'Missing payment fields');
        }
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');
        if (expectedSignature !== razorpay_signature) return jsonErr(res, 400, 'Invalid signature');

        const cart = calculateCart(cartItems || []);
        const orders = readJson(ORDERS_FILE, []);
        const order = {
            id: `ord_${Date.now()}`,
            paymentOrderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            userEmail: customer?.email || '',
            customer: customer || {},
            cart,
            paymentStatus: 'paid',
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };
        orders.unshift(order);
        writeJson(ORDERS_FILE, orders);

        const lineHtml = cart.lines.map((l) => `- ${l.name} x${l.qty}: ₹${l.lineTotal}`).join('<br>');
        await sendEmailNotification(
            `Payment successful.<br><strong>Order:</strong> ${order.id}<br><br>${lineHtml}<br><br>Total: ₹${cart.grandTotal}`,
            `${customer?.name || ''} (${customer?.email || ''})`,
            'Razorpay Order'
        );
        await sendCustomerOrderEmail(customer, order);

        // WhatsApp notification to the client
        const itemLines = cart.lines.map((l) => `• ${l.name} x${l.qty}: ₹${l.lineTotal}`).join('\n');
        const waMessage = `🎁 *New Order Received*\n\n` +
            `*Order ID:* ${order.id}\n` +
            `*Customer:* ${customer?.name || '-'}\n` +
            `*Phone:* ${customer?.phone || '-'}\n` +
            `*Email:* ${customer?.email || '-'}\n\n` +
            `*Items:*\n${itemLines}\n\n` +
            `*Total Paid:* ₹${cart.grandTotal}\n\n` +
            `*Shipping Address:*\n${customer?.address || '-'}\n\n` +
            `Please check the admin panel for full details.`;
        sendWhatsAppNotification(waMessage).catch((err) => {
            console.error('[WhatsApp] Failed to send order notification:', err);
        });

        const { notifyAdminsNewOrder, notifyCustomerOrderConfirmed } = require('./fcm');
        notifyAdminsNewOrder(order)
            .then((r) => console.log(`[FCM] Admin notify for ${order.id}:`, JSON.stringify(r)))
            .catch((err) => console.error('[FCM] Admin notify failed:', err.message));
        notifyCustomerOrderConfirmed(customer?.email, order)
            .then((r) => console.log(`[FCM] Customer notify for ${order.id}:`, JSON.stringify(r)))
            .catch((err) => console.error('[FCM] Customer notify failed:', err.message));

        return jsonOk(res, { order });
    } catch (err) {
        return jsonErr(res, 500, err.message);
    }
});

app.get('/api/config', (req, res) => {
    const key = process.env.GOOGLE_MAPS_API_KEY || '';
    const masked = key ? `${key.slice(0, 6)}...${key.slice(-4)}` : '(empty)';
    console.log(`[CONFIG] googleMapsApiKey=${masked} origin=${req.headers.origin || 'unknown'}`);
    return jsonOk(res, {
        googleMapsApiKey: key,
        mapsEnabled: Boolean(key)
    });
});

const { SYSTEM_PROMPT } = require('./ai/systemPrompt');
const { toolDeclarations } = require('./ai/toolDeclarations');
const { chatWithAura, buildSuggestions } = require('./ai/textChat');
const { chatWithMobileAura } = require('./ai/mobileAi');
const { buildMobileLiveInstruction, executeMobileLiveTool, MOBILE_LIVE_KICKOFF } = require('./ai/liveMobileHandler');
const { mobileToolDeclarations } = require('./ai/mobileTools');
const { registerToken, sendCartReminder, readTokens, broadcastToCustomers, sendNewProductsDigest, getFcmStats } = require('./fcm');

const AI_PUBLIC_DIR = path.join(__dirname, 'public');
if (!fs.existsSync(AI_PUBLIC_DIR)) {
    fs.mkdirSync(AI_PUBLIC_DIR, { recursive: true });
}
app.use('/aura-ai', express.static(AI_PUBLIC_DIR, { maxAge: '1h', index: false }));

app.get('/aura-ai/chat', (req, res) => {
    res.sendFile(path.join(AI_PUBLIC_DIR, 'aura-ai-chat.html'));
});

app.get('/api/ai/status', (req, res) => {
    return jsonOk(res, {
        ready: Boolean(GEMINI_API_KEY),
        message: GEMINI_API_KEY
            ? 'Aura AI is ready — voice on the homepage, text chat below.'
            : 'Set GEMINI_API_KEY on the server to enable Aura AI.',
        modes: { voice: true, text: true },
        chatUrl: '/aura-ai/chat',
        websocket: true
    });
});

app.get('/api/ai/suggestions', (req, res) => {
    return jsonOk(res, { suggestions: buildSuggestions(getCatalog, getSite) });
});

app.post('/api/ai/chat', async (req, res) => {
    try {
        const data = await chatWithAura({
            apiKey: GEMINI_API_KEY,
            message: req.body?.message,
            history: req.body?.history,
            getCatalog,
            getSite
        });
        return jsonOk(res, data);
    } catch (err) {
        const status = /required|empty/i.test(err.message) ? 400 : 500;
        return jsonErr(res, status, err.message);
    }
});

app.get('/api/mobile-ai/status', (req, res) => {
    return jsonOk(res, {
        ready: Boolean(GEMINI_API_KEY),
        model: process.env.GEMINI_MOBILE_MODEL || 'gemini-3.5-flash',
        message: GEMINI_API_KEY ? 'Aura AI mobile assistant is ready.' : 'Set GEMINI_API_KEY on the server.'
    });
});

app.post('/api/mobile-ai/chat', async (req, res) => {
    try {
        const data = await chatWithMobileAura({
            apiKey: GEMINI_API_KEY,
            message: req.body?.message,
            history: req.body?.history,
            cartContext: req.body?.cartContext,
            screen: req.body?.screen,
            getCatalog,
            getSite,
            getSettings,
            getSellable
        });
        return jsonOk(res, data);
    } catch (err) {
        const status = /required|empty/i.test(err.message) ? 400 : 500;
        return jsonErr(res, status, err.message);
    }
});

app.post('/api/fcm/register', (req, res) => {
    const token = String(req.body?.token || '').trim();
    if (!token) return jsonErr(res, 400, 'FCM token required');
    const role = String(req.body?.role || 'customer').trim().toLowerCase();
    let email = String(req.body?.email || '').trim().toLowerCase();
    const authToken = getToken(req);
    if (authToken) {
        try {
            const decoded = jwt.verify(authToken, JWT_SECRET);
            email = decoded.email || email;
        } catch (_) { /* optional auth */ }
    }
    if (role === 'admin') {
        try {
            const decoded = jwt.verify(authToken || '', JWT_SECRET);
            if (decoded.role !== 'admin') return jsonErr(res, 403, 'Admin token required');
        } catch (_) {
            return jsonErr(res, 401, 'Admin authentication required');
        }
    }
    registerToken({ token, role, email });
    const store = readTokens();
    return jsonOk(res, { registered: true, role, email, adminTokenCount: store.admin.length });
});

app.post('/api/fcm/cart-reminder', requireAuth, async (req, res) => {
    const itemCount = Math.max(0, Number(req.body?.itemCount || 0));
    if (itemCount <= 0) return jsonOk(res, { sent: false, reason: 'empty_cart' });
    try {
        const result = await sendCartReminder(req.auth.email, itemCount);
        return jsonOk(res, result);
    } catch (err) {
        return jsonErr(res, 500, err.message);
    }
});

app.get('/api/admin/fcm/stats', requireAdmin, (req, res) => {
    return jsonOk(res, getFcmStats());
});

app.post('/api/admin/fcm/broadcast', requireAdmin, async (req, res) => {
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    const imageUrl = String(req.body?.imageUrl || req.body?.image || '').trim();
    if (!title || !body) {
        return jsonErr(res, 400, 'title and body are required');
    }
    try {
        const result = await broadcastToCustomers({ title, body, imageUrl, type: 'broadcast' });
        return jsonOk(res, result);
    } catch (err) {
        return jsonErr(res, 500, err.message);
    }
});

app.post('/api/admin/fcm/digest', requireAdmin, async (req, res) => {
    try {
        const products = getCatalog();
        const result = await sendNewProductsDigest(products, {
            title: req.body?.title,
            body: req.body?.body,
            imageUrl: req.body?.imageUrl
        });
        return jsonOk(res, result);
    } catch (err) {
        return jsonErr(res, 500, err.message);
    }
});

const wss = new WebSocket.Server({ noServer: true });
const pendingCartTotals = new Map();

function formatCartTotalsMessage(cart) {
    const lines = cart.lines.map((l) => `${l.name} x${l.qty}: ₹${l.lineTotal}`).join(', ');
    return `Subtotal ₹${cart.subtotal}, shipping ₹${cart.shipping}, total ₹${cart.grandTotal}. Items: ${lines || 'cart is empty'}`;
}

function normalizeProductName(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const HAMPER_ORDINALS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };

function resolveHamperIndex(args) {
    const hampers = getSite().hampers || [];
    if (!hampers.length) return { idx: -1, hampers };

    if (args.hamperId) {
        const byId = hampers.findIndex((h) => h.id === args.hamperId);
        if (byId !== -1) return { idx: byId, hampers };
    }

    let index = Number(args.index);
    if (Number.isFinite(index) && index >= 1) {
        return { idx: Math.min(hampers.length - 1, index - 1), hampers };
    }
    if (args.ordinal === 'last') {
        return { idx: hampers.length - 1, hampers };
    }
    if (args.ordinal && HAMPER_ORDINALS[args.ordinal]) {
        const idx = HAMPER_ORDINALS[args.ordinal] - 1;
        if (idx < hampers.length) return { idx, hampers };
    }

    const needle = normalizeProductName(args.hamperName || '');
    if (!needle) return { idx: -1, hampers };

    const exact = hampers.findIndex((h) => normalizeProductName(h.title) === needle);
    if (exact !== -1) return { idx: exact, hampers };

    const substring = hampers.findIndex((h) => {
        const t = normalizeProductName(h.title);
        return t.includes(needle) || needle.includes(t);
    });
    if (substring !== -1) return { idx: substring, hampers };

    const needleTokens = needle.split(' ').filter((w) => w.length > 2);
    if (!needleTokens.length) return { idx: -1, hampers };

    let bestIdx = -1;
    let bestScore = 0;
    hampers.forEach((h, i) => {
        const titleTokens = normalizeProductName(h.title).split(' ').filter((w) => w.length > 2);
        const score = needleTokens.filter((t) =>
            titleTokens.some((tt) => tt.includes(t) || t.includes(tt))
        ).length;
        if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
        }
    });
    if (bestScore >= 1) return { idx: bestIdx, hampers };

    return { idx: -1, hampers };
}

function sendViewHamperToClient(clientWs, h, idx) {
    clientWs.send(JSON.stringify({ type: 'navigate_home' }));
    clientWs.send(JSON.stringify({
        type: 'view_hamper',
        hamperId: h.id,
        index: idx,
        title: h.title,
        price: Number(h.price) || 0
    }));
}

function resolveProductId(args, lastViewedProduct) {
    if (args.productId) return args.productId;
    if (lastViewedProduct?.productId) return lastViewedProduct.productId;
    if (!args.productName) return '';
    const catalog = getCatalog();
    const wantPrice = args.productPrice ? Number(args.productPrice) : null;
    const byExact = catalog.find(
        (p) => p.name === args.productName && (wantPrice == null || Number(p.price) === wantPrice)
    );
    if (byExact) return byExact.id;
    const byName = catalog.find((p) => p.name === args.productName);
    if (byName) return byName.id;
    const needle = normalizeProductName(args.productName);
    const byFuzzy = catalog.find((p) => {
        const n = normalizeProductName(p.name);
        return n === needle || n.includes(needle) || needle.includes(n);
    });
    if (byFuzzy) return byFuzzy.id;
    const hampers = getSite().hampers || [];
    const hamper = hampers.find((h) => {
        const t = normalizeProductName(h.title);
        return h.title === args.productName || t === needle || t.includes(needle) || needle.includes(t);
    });
    if (hamper) return hamper.id;
    return '';
}

const TOOL_DEDUPE_MS = {
    add_to_cart: 6000,
    calculate_cart_total: 5000,
    browse_collection: 12000,
    show_hampers: 12000,
    view_hamper: 4000,
    navigate_home: 6000,
    scroll_to_section: 6000,
    view_product: 4000,
    next_product: 2500,
    previous_product: 2500
};

function makeToolDedupeKey(name, args) {
    return `${name}:${JSON.stringify(args || {})}`;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestCartTotalsFromClient(clientWs) {
    const requestId = crypto.randomUUID();
    const totalsPromise = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            pendingCartTotals.delete(requestId);
            reject(new Error('Cart totals request timed out'));
        }, 6000);
        pendingCartTotals.set(requestId, (payload) => {
            clearTimeout(timer);
            resolve(payload);
        });
    });
    clientWs.send(JSON.stringify({ type: 'calculate_cart_total', requestId }));
    return totalsPromise;
}

function extractAudioChunksFromLiveMessage(message) {
    const chunks = [];
    const parts = message?.serverContent?.modelTurn?.parts || [];
    for (const part of parts) {
        const mime = part?.inlineData?.mimeType || '';
        if (part?.inlineData?.data && mime.includes('audio')) {
            chunks.push(part.inlineData.data);
        }
    }
    return chunks;
}

function sendGeminiPayloadToClient(clientWs, message) {
    const audioChunks = extractAudioChunksFromLiveMessage(message);
    if (audioChunks.length) {
        for (const chunk of audioChunks) {
            clientWs.send(JSON.stringify({ type: 'gemini_message', data: { ...message, data: chunk } }));
        }
        return;
    }
    clientWs.send(JSON.stringify({ type: 'gemini_message', data: message }));
}

function friendlyGeminiError(raw) {
    const msg = String(raw || 'Unknown error');
    if (/quota|billing|exceeded|resource_exhausted|429/i.test(msg)) {
        return 'Aura AI voice is unavailable — your Gemini API quota is exceeded. Add billing or wait for quota reset in Google AI Studio, then restart the server.';
    }
    if (/api key|api_key|invalid.*key|401|403/i.test(msg)) {
        return 'Aura AI could not authenticate — check GEMINI_API_KEY in the server .env file.';
    }
    return msg;
}

const GEMINI_KICKOFF_TEXT = '[SYSTEM NOTE: The customer just opened Aura AI on the Aura Boxed Gifts website. Greet them warmly in one short sentence and ask how you can help with gifts or hampers.]';
function buildKickoffText(userName) {
    if (userName) {
        return `[SYSTEM NOTE: The customer ${userName} just opened Aura AI on the Aura Boxed Gifts website. Their name is ${userName}. Greet them by name warmly in one short sentence and ask how you can help with gifts or hampers.]`;
    }
    return GEMINI_KICKOFF_TEXT;
}

wss.on('connection', (clientWs, request) => {
    const clientIp = request?.socket?.remoteAddress || 'unknown';
    let isMobileClient = false;
    let clientUserName = null;
    try {
        const host = request.headers.host || 'localhost';
        const requestUrl = new URL(request.url || '/', `http://${host}`);
        isMobileClient = requestUrl.searchParams.get('platform') === 'android';
        const nameParam = requestUrl.searchParams.get('name');
        if (nameParam) {
            clientUserName = decodeURIComponent(nameParam);
        }
    } catch (_) {
        isMobileClient = false;
    }
    console.log(`[WS] Aura AI client connected (${clientIp})${isMobileClient ? ' [android]' : ''}`);

    let geminiSession = null;
    let geminiReady = false;
    const inboundQueue = [];
    let activeCollection = null;
    let lastViewedProduct = null;
    const toolDedupe = new Map();
    let lastCartTotals = null;
    let lastCartTotalsAt = 0;
    let lastBrowseCollection = null;
    let lastBrowseAt = 0;
    let toolChain = Promise.resolve();

    clientWs.send(JSON.stringify({ type: 'status', status: 'connecting' }));

    const flushInboundQueue = () => {
        if (!geminiSession || !geminiReady) return;
        while (inboundQueue.length) {
            handleClientMessage(inboundQueue.shift());
        }
    };

    const connectToGemini = async () => {
        try {
            console.log('[Gemini] Connecting Live session…');
            const { GoogleGenAI, Modality } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
            geminiSession = await ai.live.connect({
            model: 'gemini-3.1-flash-live-preview',
            callbacks: {
                onopen: () => {
                    console.log('[Gemini] Live socket open');
                },
                onmessage: async (message) => {
                    if (!geminiSession) return;
                    if (message.toolCall?.functionCalls?.length) {
                        toolChain = toolChain.then(async () => {
                            const functionResponses = [];
                            for (const fc of message.toolCall.functionCalls) {
                                const args = fc.args || {};
                                const dedupeKey = makeToolDedupeKey(fc.name, args);
                                const dedupeMs = TOOL_DEDUPE_MS[fc.name] || 2500;
                                const cached = toolDedupe.get(dedupeKey);
                                if (cached && Date.now() - cached.ts < dedupeMs) {
                                    console.log(`[AI_TOOL] dedupe ${fc.name} ${JSON.stringify(args)}`);
                                    functionResponses.push({
                                        id: fc.id,
                                        name: fc.name,
                                        response: { ...cached.response, deduped: true }
                                    });
                                    continue;
                                }

                                console.log(`[AI_TOOL] ${fc.name} ${JSON.stringify(args)}`);
                                let response = { result: 'ok' };

                                if (isMobileClient) {
                                    const mobileResult = await executeMobileLiveTool(fc, clientWs, {
                                        getCatalog,
                                        getSite,
                                        getSellable,
                                        resolveProductId,
                                        lastViewedProduct,
                                        requestCartTotalsFromClient,
                                        formatCartTotalsMessage,
                                        calculateCart,
                                        createOtp,
                                        sleep
                                    });
                                    if (mobileResult.lastViewedProduct) {
                                        lastViewedProduct = mobileResult.lastViewedProduct;
                                    }
                                    response = mobileResult.response;
                                    toolDedupe.set(dedupeKey, { ts: Date.now(), response });
                                    functionResponses.push({ id: fc.id, name: fc.name, response });
                                    continue;
                                }

                                if (fc.name === 'send_message') {
                                    response = await sendEmailNotification(
                                        args.message,
                                        args.senderInfo,
                                        args.inquiryType || 'General'
                                    );
                                } else if (fc.name === 'browse_collection') {
                                    const collection = args.collection;
                                    const collectionProducts = getCatalog().filter((p) => p.collection === collection);
                                    const note = collectionProducts
                                        .map((p, i) => `${i + 1}. ${p.name} (₹${p.price})`)
                                        .join('\n');
                                    const alreadyThere =
                                        activeCollection === collection &&
                                        lastBrowseCollection === collection &&
                                        Date.now() - lastBrowseAt < (TOOL_DEDUPE_MS.browse_collection || 12000);
                                    if (!alreadyThere) {
                                        activeCollection = collection;
                                        lastBrowseCollection = collection;
                                        lastBrowseAt = Date.now();
                                        clientWs.send(JSON.stringify({
                                            type: 'navigate',
                                            url: `collections/${collection}.html`
                                        }));
                                    }
                                    response = {
                                        result: alreadyThere
                                            ? `Already showing ${collection} collection`
                                            : `Navigated to ${collection}`,
                                        products: note || 'No products in this collection'
                                    };
                                } else if (fc.name === 'navigate_home') {
                                    activeCollection = null;
                                    clientWs.send(JSON.stringify({ type: 'navigate_home' }));
                                    response = { result: 'Navigated home' };
                                } else if (fc.name === 'scroll_to_section') {
                                    clientWs.send(JSON.stringify({ type: 'scroll_to_section', section: args.section }));
                                    response = { result: `Scrolled to ${args.section}` };
                                } else if (fc.name === 'show_hampers') {
                                    activeCollection = null;
                                    const hampers = getSite().hampers || [];
                                    const specific = args.hamperName || args.hamperId || args.index || args.ordinal;
                                    if (specific) {
                                        const { idx } = resolveHamperIndex(args);
                                        if (idx !== -1) {
                                            const h = hampers[idx];
                                            sendViewHamperToClient(clientWs, h, idx);
                                            response = {
                                                result: `Opened ${h.title}${Number(h.price) > 0 ? ` priced at ₹${h.price}` : ''}. It is fully customisable — theme, colours and items can be changed.`,
                                                hamperId: h.id,
                                                title: h.title,
                                                price: Number(h.price) || 0,
                                                subtitle: h.subtitle || ''
                                            };
                                        } else {
                                            clientWs.send(JSON.stringify({ type: 'navigate_home' }));
                                            clientWs.send(JSON.stringify({ type: 'scroll_to_section', section: 'hampers' }));
                                            response = {
                                                result: `Could not find a hamper matching "${args.hamperName || args.hamperId || ''}". Showing all hampers instead. Available: ${hampers.map((h) => h.title).join(', ') || 'none'}`,
                                                count: hampers.length,
                                                hampers: hampers.map((h, i) => `${i + 1}. ${h.title}${Number(h.price) > 0 ? ` (₹${h.price})` : ''}`).join('\n') || 'No hampers configured'
                                            };
                                        }
                                    } else {
                                        clientWs.send(JSON.stringify({ type: 'navigate_home' }));
                                        clientWs.send(JSON.stringify({ type: 'scroll_to_section', section: 'hampers' }));
                                        const note = hampers
                                            .map((h, i) => `${i + 1}. ${h.title}${Number(h.price) > 0 ? ` (₹${h.price})` : ''}`)
                                            .join('\n');
                                        response = {
                                            result: 'Showing trending hampers',
                                            count: hampers.length,
                                            hampers: note || 'No hampers configured'
                                        };
                                    }
                                } else if (fc.name === 'view_hamper') {
                                    const { idx, hampers } = resolveHamperIndex(args);
                                    if (idx === -1) {
                                        response = {
                                            result: `Could not find a hamper matching "${args.hamperName || args.hamperId || ''}". Available: ${hampers.map((h) => h.title).join(', ') || 'none'}`
                                        };
                                    } else {
                                        activeCollection = null;
                                        const h = hampers[idx];
                                        sendViewHamperToClient(clientWs, h, idx);
                                        response = {
                                            result: `Opened ${h.title}${Number(h.price) > 0 ? ` priced at ₹${h.price}` : ''}. It is fully customisable — theme, colours and items can be changed.`,
                                            hamperId: h.id,
                                            title: h.title,
                                            price: Number(h.price) || 0,
                                            subtitle: h.subtitle || ''
                                        };
                                    }
                                } else if (fc.name === 'request_custom_hamper') {
                                    const details = [
                                        args.occasion ? `Occasion: ${args.occasion}` : '',
                                        args.recipient ? `For: ${args.recipient}` : '',
                                        args.budget ? `Budget: ${args.budget}` : '',
                                        args.preferences ? `Preferences: ${args.preferences}` : ''
                                    ]
                                        .filter(Boolean)
                                        .join('<br>');
                                    response = await sendEmailNotification(
                                        `New custom hamper request via Aura AI:<br><br>${details}`,
                                        args.contact || 'Not provided',
                                        'Custom Hamper'
                                    );
                                } else if (fc.name === 'next_product') {
                                    clientWs.send(JSON.stringify({ type: 'next_product' }));
                                    response = { result: 'Moved to next product' };
                                } else if (fc.name === 'previous_product') {
                                    clientWs.send(JSON.stringify({ type: 'previous_product' }));
                                    response = { result: 'Moved to previous product' };
                                } else if (fc.name === 'view_product') {
                                    let index = Number(args.index || 1);
                                    if (!Number.isFinite(index) || index < 1) index = 1;
                                    const map = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };
                                    if (args.ordinal && map[args.ordinal]) index = map[args.ordinal];
                                    if (args.ordinal === 'last' && activeCollection) {
                                        const len = getCatalog().filter((p) => p.collection === activeCollection).length;
                                        if (len) index = len;
                                    }
                                    clientWs.send(JSON.stringify({ type: 'view_product', index }));
                                    response = { result: `Opened product ${index}` };
                                } else if (fc.name === 'add_to_cart') {
                                    const resolvedProductId = resolveProductId(args, lastViewedProduct);
                                    const sellable = resolvedProductId ? getSellable(resolvedProductId) : null;
                                    clientWs.send(JSON.stringify({
                                        type: 'add_to_cart',
                                        productId: resolvedProductId,
                                        productName: args.productName || sellable?.name || '',
                                        productPrice: Number(args.productPrice || sellable?.price || 0)
                                    }));
                                    try {
                                        await sleep(450);
                                        const payload = await requestCartTotalsFromClient(clientWs);
                                        const cart = payload?.cart || calculateCart(payload?.items || []);
                                        lastCartTotals = cart;
                                        lastCartTotalsAt = Date.now();
                                        const spoken = formatCartTotalsMessage(cart);
                                        response = {
                                            result: `Added ${args.productName || sellable?.name || 'item'}. ${spoken}`,
                                            productId: resolvedProductId,
                                            subtotal: cart.subtotal,
                                            shipping: cart.shipping,
                                            grandTotal: cart.grandTotal,
                                            currency: cart.currency,
                                            lines: cart.lines
                                        };
                                    } catch (err) {
                                        const fallback = calculateCart(
                                            resolvedProductId ? [{ productId: resolvedProductId, qty: 1 }] : []
                                        );
                                        response = {
                                            result: `Added ${args.productName || sellable?.name || 'item'}${resolvedProductId ? '' : ' (product id unknown)'}. ${formatCartTotalsMessage(fallback)}`,
                                            productId: resolvedProductId,
                                            error: err.message,
                                            subtotal: fallback.subtotal,
                                            shipping: fallback.shipping,
                                            grandTotal: fallback.grandTotal,
                                            lines: fallback.lines
                                        };
                                    }
                                } else if (fc.name === 'calculate_cart_total') {
                                    if (lastCartTotals && Date.now() - lastCartTotalsAt < 5000) {
                                        const cart = lastCartTotals;
                                        response = {
                                            result: formatCartTotalsMessage(cart),
                                            subtotal: cart.subtotal,
                                            shipping: cart.shipping,
                                            grandTotal: cart.grandTotal,
                                            currency: cart.currency,
                                            lines: cart.lines,
                                            cached: true
                                        };
                                    } else {
                                        try {
                                            const payload = await requestCartTotalsFromClient(clientWs);
                                            const cart = payload?.cart || calculateCart(payload?.items || []);
                                            lastCartTotals = cart;
                                            lastCartTotalsAt = Date.now();
                                            response = {
                                                result: formatCartTotalsMessage(cart),
                                                subtotal: cart.subtotal,
                                                shipping: cart.shipping,
                                                grandTotal: cart.grandTotal,
                                                currency: cart.currency,
                                                lines: cart.lines
                                            };
                                        } catch (err) {
                                            response = {
                                                result: 'Could not read cart from browser.',
                                                error: err.message
                                            };
                                        }
                                    }
                                } else if (fc.name === 'open_checkout') {
                                    clientWs.send(JSON.stringify({ type: 'open_checkout' }));
                                    response = { result: 'Opened checkout page' };
                                } else if (fc.name === 'show_cart') {
                                    clientWs.send(JSON.stringify({ type: 'show_cart' }));
                                    response = { result: 'Opened cart' };
                                } else if (fc.name === 'open_login') {
                                    clientWs.send(JSON.stringify({ type: 'open_login' }));
                                    response = { result: 'Opened login/signup modal for the user' };
                                } else if (fc.name === 'auth_enter_email') {
                                    clientWs.send(JSON.stringify({ type: 'auth_enter_email', email: args.email }));
                                    response = { result: `Entered email ${args.email} and submitted. The system will check if this is a new user (OTP sent) or existing user (password prompt shown). Ask the user for the OTP or password.` };
                                } else if (fc.name === 'auth_enter_otp') {
                                    clientWs.send(JSON.stringify({ type: 'auth_enter_otp', otp: args.otp }));
                                    response = { result: 'Entered and submitted OTP. The user should now be logged in if the OTP was correct.' };
                                } else if (fc.name === 'auth_enter_password') {
                                    clientWs.send(JSON.stringify({ type: 'auth_enter_password', password: args.password }));
                                    response = { result: 'Entered and submitted password. The user should now be logged in if the password was correct.' };
                                }

                                toolDedupe.set(dedupeKey, { ts: Date.now(), response });
                                functionResponses.push({ id: fc.id, name: fc.name, response });
                            }
                            if (functionResponses.length && geminiSession) {
                                geminiSession.sendToolResponse({ functionResponses });
                            }
                        }).catch((err) => console.error('[AI_TOOL] batch error:', err));
                    }
                    sendGeminiPayloadToClient(clientWs, message);
                },
                onerror: (error) => {
                    const msg = friendlyGeminiError(error?.message || String(error));
                    console.error('[Gemini] Live session error:', msg);
                    geminiReady = false;
                    clientWs.send(JSON.stringify({ type: 'error', error: msg }));
                },
                onclose: (event) => {
                    geminiReady = false;
                    const reason = friendlyGeminiError(event?.reason || 'Connection closed');
                    console.log(`[Gemini] Live session closed: ${reason}`);
                    if (/quota|billing|exceeded/i.test(String(event?.reason || ''))) {
                        clientWs.send(JSON.stringify({ type: 'error', error: reason }));
                    }
                    clientWs.send(JSON.stringify({ type: 'status', status: 'disconnected', reason }));
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: isMobileClient
                    ? buildMobileLiveInstruction(getCatalog, getSite, getSettings)
                    : SYSTEM_PROMPT,
                tools: isMobileClient
                    ? [{ functionDeclarations: mobileToolDeclarations }]
                    : [{ googleSearch: {} }, { functionDeclarations: toolDeclarations }],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                thinkingLevel: 'minimal',
                contextWindowCompression: { slidingWindow: {} }
            }
            });

            geminiReady = true;
            console.log(`[Gemini] Live session ready${isMobileClient ? ' (android)' : ''}`);
            clientWs.send(JSON.stringify({ type: 'status', status: 'connected' }));
            try {
                for (const item of inboundQueue) {
                    if (item && item.type === 'user_info' && item.name) {
                        clientUserName = item.name;
                    }
                }
                geminiSession.sendRealtimeInput({
                    text: buildKickoffText(clientUserName)
                });
            } catch (kickErr) {
                console.warn('[Gemini] Kickoff message failed:', kickErr.message);
            }
            flushInboundQueue();
        } catch (err) {
            geminiReady = false;
            geminiSession = null;
            const msg = friendlyGeminiError(err.message || String(err));
            console.error('[Gemini] Failed to connect:', msg);
            clientWs.send(JSON.stringify({ type: 'error', error: msg }));
        }
    };

    connectToGemini();

    function handleClientMessage(message) {
            if (message.type === 'cart_totals_response') {
                const resolver = pendingCartTotals.get(message.requestId);
                if (resolver) {
                    pendingCartTotals.delete(message.requestId);
                    resolver(message);
                }
                return;
            }
            if (message.type === 'audio') {
                geminiSession.sendRealtimeInput({ audio: { data: message.data, mimeType: 'audio/pcm;rate=16000' } });
            } else if (message.type === 'text') {
                geminiSession.sendRealtimeInput({ text: message.data });
            } else if (message.type === 'user_info') {
                // Receive user info before kickoff for personalized greeting
                if (message.name) clientUserName = message.name;
            } else if (message.type === 'context_update') {
                if (message.productId || message.productName) {
                    lastViewedProduct = {
                        productId: message.productId || '',
                        productName: message.productName || '',
                        productPrice: Number(message.productPrice || 0)
                    };
                }
                let sysNote = '';
                if (message.action === 'added_to_cart') {
                    sysNote = `[SYSTEM NOTE: ${message.productName || 'Item'} is in the cart. Do not call add_to_cart or calculate_cart_total again unless the customer asks.]`;
                } else {
                    sysNote = `[SYSTEM NOTE: User is viewing productId=${message.productId || 'unknown'} name=${message.productName} priced at Rs.${message.productPrice}. If adding to cart, include productId in add_to_cart arguments.]`;
                }
                geminiSession.sendRealtimeInput({ text: sysNote });
            }
    }

    clientWs.on('message', async (raw) => {
        try {
            const message = JSON.parse(raw);
            if (!geminiSession || !geminiReady) {
                if (message.type === 'audio' || message.type === 'text' || message.type === 'context_update') {
                    inboundQueue.push(message);
                }
                return;
            }
            handleClientMessage(message);
        } catch (err) {
            console.error('[WS] Message handling error:', err);
        }
    });

    clientWs.on('close', () => {
        console.log('[WS] Aura AI client disconnected');
        geminiReady = false;
        if (geminiSession) {
            try { geminiSession.close(); } catch (err) {}
            geminiSession = null;
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Aura AI Backend',
        auraAi: {
            websocket: true,
            textChat: true,
            chatUrl: '/aura-ai/chat',
            geminiConfigured: Boolean(GEMINI_API_KEY)
        }
    });
});

const server = app.listen(PORT, () => {
    console.log(`Aura backend running on ${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

process.on('unhandledRejection', (reason) => {
    console.error('[Aura] Unhandled rejection:', reason);
});
