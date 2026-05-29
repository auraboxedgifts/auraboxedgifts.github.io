const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const nodemailer = require('nodemailer');
const Razorpay = require('razorpay');
const crypto = require('crypto');
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

const DEFAULT_SITE = {
    hero: {
        slides: [
            { id: 'hero_1', image: '/images/web/auraboxedgifts.png', alt: 'Aura Boxed Gifts' }
        ]
    },
    hampers: []
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
    return site;
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
    const shipping = lines.length ? 70 : 0;
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

async function sendEmailNotification(message, senderInfo = '', inquiryType = 'General') {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD || !process.env.RECIPIENT_EMAIL) {
        return { success: false, error: 'Email credentials not configured on server.' };
    }
    try {
        const info = await emailTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.RECIPIENT_EMAIL,
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
        return { success: true, messageId: info.messageId };
    } catch (error) {
        return { success: false, error: error.message };
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
        description: String(req.body?.description || '')
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
    collections[idx] = next;
    writeJson(COLLECTIONS_FILE, collections);
    regenerateCollectionPages();
    return jsonOk(res, next);
});

app.delete('/api/admin/collections/:slug', requireAdmin, (req, res) => {
    const collections = readJson(COLLECTIONS_FILE, []);
    const slug = req.params.slug;
    const next = collections.filter((c) => c.slug !== slug);
    if (next.length === collections.length) return jsonErr(res, 404, 'Collection not found');
    const products = getCatalog();
    const inUse = products.some((p) => p.collection === slug);
    if (inUse && !req.query.force) {
        return jsonErr(res, 400, 'Collection has products. Move or delete them first, or pass ?force=1 to remove products as well.');
    }
    writeJson(COLLECTIONS_FILE, next);
    if (inUse) {
        writeJson(PRODUCTS_FILE, products.filter((p) => p.collection !== slug));
    }
    regenerateCollectionPages();
    return jsonOk(res, { deleted: true });
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
    user.updatedAt = new Date().toISOString();
    users[email] = user;
    writeJson(USERS_FILE, users);
    return jsonOk(res, sanitizeUser(user, email));
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

const wss = new WebSocket.Server({ noServer: true });
const pendingCartTotals = new Map();

function formatCartTotalsMessage(cart) {
    const lines = cart.lines.map((l) => `${l.name} x${l.qty}: ₹${l.lineTotal}`).join(', ');
    return `Subtotal ₹${cart.subtotal}, shipping ₹${cart.shipping}, total ₹${cart.grandTotal}. Items: ${lines || 'cart is empty'}`;
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

wss.on('connection', (clientWs, request) => {
    const clientIp = request?.socket?.remoteAddress || 'unknown';
    console.log(`[WS] Aura AI client connected (${clientIp})`);

    let geminiSession = null;
    let geminiReady = false;
    const inboundQueue = [];
    let activeCollection = null;
    let lastViewedProduct = null;

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
            const session = await ai.live.connect({
            model: 'gemini-3.1-flash-live-preview',
            callbacks: {
                onopen: () => {
                    geminiReady = true;
                    console.log('[Gemini] Live session ready');
                    clientWs.send(JSON.stringify({ type: 'status', status: 'connected' }));
                    try {
                        session.sendRealtimeInput({
                            text: '[SYSTEM NOTE: The customer just opened Aura AI on the Aura Boxed Gifts website. Greet them warmly in one short sentence and ask how you can help with gifts or hampers.]'
                        });
                    } catch (kickErr) {
                        console.warn('[Gemini] Kickoff message failed:', kickErr.message);
                    }
                    flushInboundQueue();
                },
                onmessage: async (message) => {
                    if (message.toolCall?.functionCalls) {
                        for (const fc of message.toolCall.functionCalls) {
                            const args = fc.args || {};
                            console.log(`[AI_TOOL] ${fc.name} ${JSON.stringify(args)}`);
                            let response = { result: 'ok' };
                            if (fc.name === 'send_message') {
                                response = await sendEmailNotification(args.message, args.senderInfo, args.inquiryType || 'General');
                            } else if (fc.name === 'browse_collection') {
                                activeCollection = args.collection;
                                clientWs.send(JSON.stringify({ type: 'navigate', url: `collections/${args.collection}.html` }));
                                const collectionProducts = getCatalog().filter((p) => p.collection === args.collection);
                                if (collectionProducts.length) {
                                    const randomIndex = Math.floor(Math.random() * collectionProducts.length) + 1;
                                    clientWs.send(JSON.stringify({ type: 'view_product', index: randomIndex }));
                                    const note = collectionProducts
                                        .map((p, i) => `${i + 1}. ${p.name} (₹${p.price})`)
                                        .join('\n');
                                    session.sendRealtimeInput({
                                        text: `[SYSTEM NOTE: Current collection products:\n${note}\nUser is currently shown product #${randomIndex}.]`
                                    });
                                }
                                response = { result: `Navigated to ${args.collection}` };
                            } else if (fc.name === 'navigate_home') {
                                activeCollection = null;
                                clientWs.send(JSON.stringify({ type: 'navigate_home' }));
                                response = { result: 'Navigated home' };
                            } else if (fc.name === 'scroll_to_section') {
                                clientWs.send(JSON.stringify({ type: 'scroll_to_section', section: args.section }));
                                response = { result: `Scrolled to ${args.section}` };
                            } else if (fc.name === 'show_hampers') {
                                activeCollection = null;
                                clientWs.send(JSON.stringify({ type: 'navigate_home' }));
                                clientWs.send(JSON.stringify({ type: 'scroll_to_section', section: 'hampers' }));
                                const hampers = getSite().hampers || [];
                                if (hampers.length) {
                                    const note = hampers.map((h, i) => `${i + 1}. ${h.title}`).join('\n');
                                    session.sendRealtimeInput({
                                        text: `[SYSTEM NOTE: Trending hampers now visible to the user:\n${note}\nAll are fully customisable. Suggest ones matching their occasion.]`
                                    });
                                }
                                response = { result: 'Showing trending hampers', count: hampers.length };
                            } else if (fc.name === 'request_custom_hamper') {
                                const details = [
                                    args.occasion ? `Occasion: ${args.occasion}` : '',
                                    args.recipient ? `For: ${args.recipient}` : '',
                                    args.budget ? `Budget: ${args.budget}` : '',
                                    args.preferences ? `Preferences: ${args.preferences}` : ''
                                ].filter(Boolean).join('<br>');
                                response = await sendEmailNotification(
                                    `New custom hamper request via Aura AI:<br><br>${details}`,
                                    args.contact || 'Not provided',
                                    'Custom Hamper'
                                );
                                if (response && response.success) {
                                    session.sendRealtimeInput({
                                        text: `[SYSTEM NOTE: Custom hamper request emailed to the team successfully. Reassure the customer the team will follow up and invite them to DM @aura_boxedgifts too.]`
                                    });
                                }
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
                                let resolvedProductId = args.productId || '';
                                if (!resolvedProductId && lastViewedProduct?.productId) {
                                    resolvedProductId = lastViewedProduct.productId;
                                }
                                if (!resolvedProductId && args.productName) {
                                    const catalog = getCatalog();
                                    const byExact = catalog.find((p) =>
                                        p.name === args.productName &&
                                        (!args.productPrice || Number(p.price) === Number(args.productPrice))
                                    );
                                    const byName = catalog.find((p) => p.name === args.productName);
                                    resolvedProductId = (byExact || byName || {}).id || '';
                                }
                                clientWs.send(JSON.stringify({
                                    type: 'add_to_cart',
                                    productId: resolvedProductId,
                                    productName: args.productName || '',
                                    productPrice: Number(args.productPrice || 0)
                                }));
                                const previewCart = calculateCart(
                                    (Array.isArray(args.items) ? args.items : []).length
                                        ? args.items
                                        : [{ productId: resolvedProductId, qty: 1 }]
                                );
                                response = {
                                    result: `Added ${args.productName || 'product'} to cart`,
                                    hint: 'Call calculate_cart_total to announce updated totals including shipping.'
                                };
                                if (resolvedProductId && previewCart.lines.length) {
                                    session.sendRealtimeInput({
                                        text: `[SYSTEM NOTE: Item added. Current preview for that line: ${formatCartTotalsMessage(previewCart)}. Use calculate_cart_total for full cart.]`
                                    });
                                }
                            } else if (fc.name === 'calculate_cart_total') {
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
                                try {
                                    const payload = await totalsPromise;
                                    const cart = payload?.cart || calculateCart(payload?.items || []);
                                    const spoken = formatCartTotalsMessage(cart);
                                    session.sendRealtimeInput({
                                        text: `[SYSTEM NOTE: Cart totals calculated on server — ${spoken}. Tell the customer clearly including shipping.]`
                                    });
                                    response = {
                                        result: spoken,
                                        subtotal: cart.subtotal,
                                        shipping: cart.shipping,
                                        grandTotal: cart.grandTotal,
                                        currency: cart.currency,
                                        lines: cart.lines
                                    };
                                } catch (err) {
                                    response = { result: 'Could not read cart from browser. Ask user to open cart first.', error: err.message };
                                }
                            } else if (fc.name === 'open_checkout') {
                                clientWs.send(JSON.stringify({ type: 'open_checkout' }));
                                response = { result: 'Opened checkout page' };
                            } else if (fc.name === 'show_cart') {
                                clientWs.send(JSON.stringify({ type: 'show_cart' }));
                                response = { result: 'Opened cart' };
                            }
                            session.sendToolResponse({
                                functionResponses: [{ id: fc.id, name: fc.name, response }]
                            });
                        }
                    }
                    sendGeminiPayloadToClient(clientWs, message);
                },
                onerror: (error) => {
                    const msg = error?.message || String(error);
                    console.error('[Gemini] Live session error:', msg);
                    clientWs.send(JSON.stringify({ type: 'error', error: msg }));
                },
                onclose: (event) => {
                    geminiReady = false;
                    const reason = event?.reason || 'Connection closed';
                    console.log(`[Gemini] Live session closed: ${reason}`);
                    clientWs.send(JSON.stringify({ type: 'status', status: 'disconnected', reason }));
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: SYSTEM_PROMPT,
                tools: [{ googleSearch: {} }, { functionDeclarations: toolDeclarations }],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                thinkingLevel: 'minimal',
                contextWindowCompression: { slidingWindow: {} }
            }
            });
            geminiSession = session;
        } catch (err) {
            console.error('[Gemini] Failed to connect:', err);
            clientWs.send(JSON.stringify({
                type: 'error',
                error: err.message || 'Could not start Aura AI. Check GEMINI_API_KEY on the server.'
            }));
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
                    sysNote = `[SYSTEM NOTE: Added to cart: ${message.productName}]`;
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
