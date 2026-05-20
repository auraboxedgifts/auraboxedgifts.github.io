const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const nodemailer = require('nodemailer');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is required.');
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    console.warn('WARN: JWT_SECRET is missing. Using fallback secret for this boot only.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-change-me';

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const COLLECTIONS_FILE = path.join(DATA_DIR, 'collections.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]');
if (!fs.existsSync(PRODUCTS_FILE)) fs.writeFileSync(PRODUCTS_FILE, '[]');
if (!fs.existsSync(COLLECTIONS_FILE)) fs.writeFileSync(COLLECTIONS_FILE, '[]');

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
app.use(express.json());
app.use((req, res, next) => {
    const ts = new Date().toISOString();
    console.log(`[API] ${ts} ${req.method} ${req.path}`);
    next();
});

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

function getCatalog() {
    return readJson(PRODUCTS_FILE, []);
}

function calculateCart(items) {
    const products = getCatalog();
    const lines = [];
    let subtotal = 0;
    for (const row of items || []) {
        const qty = Math.max(1, Number(row.qty || 1));
        const product = products.find((p) => p.id === row.productId);
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

app.post('/api/cart/calculate', (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    return jsonOk(res, calculateCart(items));
});

// Auth APIs
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
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ success: true, token, email });
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
    return jsonOk(res, users[req.auth.email] || null);
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
    return jsonOk(res, user);
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

        return jsonOk(res, { order });
    } catch (err) {
        return jsonErr(res, 500, err.message);
    }
});

app.get('/api/config', (req, res) => {
    return res.json({
        success: true,
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
    });
});

const { SYSTEM_PROMPT } = require('./ai/systemPrompt');
const { toolDeclarations } = require('./ai/toolDeclarations');

const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (clientWs) => {
    let geminiSession = null;
    let activeCollection = null;

    const connectToGemini = async () => {
        const { GoogleGenAI, Modality } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const session = await ai.live.connect({
            model: 'gemini-3.1-flash-live-preview',
            callbacks: {
                onopen: () => clientWs.send(JSON.stringify({ type: 'status', status: 'connected' })),
                onmessage: async (message) => {
                    let audioData = null;
                    if (message.serverContent?.modelTurn?.parts) {
                        for (const part of message.serverContent.modelTurn.parts) {
                            if (part.inlineData?.mimeType?.includes('audio')) {
                                audioData = part.inlineData.data;
                                break;
                            }
                        }
                    }
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
                                response = { result: `Added ${args.productName || 'product'} to cart` };
                            } else if (fc.name === 'show_cart') {
                                clientWs.send(JSON.stringify({ type: 'show_cart' }));
                                response = { result: 'Opened cart' };
                            }
                            session.sendToolResponse({
                                functionResponses: [{ id: fc.id, name: fc.name, response }]
                            });
                        }
                    }
                    clientWs.send(JSON.stringify({ type: 'gemini_message', data: { ...message, data: audioData } }));
                },
                onerror: (error) => clientWs.send(JSON.stringify({ type: 'error', error: error.message || 'Unknown error' })),
                onclose: (event) => clientWs.send(JSON.stringify({ type: 'status', status: 'disconnected', reason: event?.reason || 'Connection closed' }))
            },
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: SYSTEM_PROMPT,
                tools: [{ googleSearch: {} }, { functionDeclarations: toolDeclarations }],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                thinkingConfig: { thinkingLevel: 'low' },
                contextWindowCompression: { slidingWindow: {} }
            }
        });
        geminiSession = session;
    };

    connectToGemini();

    clientWs.on('message', async (raw) => {
        try {
            const message = JSON.parse(raw);
            if (!geminiSession) return;
            if (message.type === 'audio') {
                geminiSession.sendRealtimeInput({ audio: { data: message.data, mimeType: 'audio/pcm;rate=16000' } });
            } else if (message.type === 'text') {
                geminiSession.sendRealtimeInput({ text: message.data });
            } else if (message.type === 'context_update') {
                let sysNote = '';
                if (message.action === 'added_to_cart') {
                    sysNote = `[SYSTEM NOTE: Added to cart: ${message.productName}]`;
                } else {
                    sysNote = `[SYSTEM NOTE: User is viewing ${message.productName} priced at Rs.${message.productPrice}. Ask if they want add-to-cart or another product.]`;
                }
                geminiSession.sendRealtimeInput({ text: sysNote });
            }
        } catch (err) {
            console.error('Message handling error:', err);
        }
    });

    clientWs.on('close', () => {
        if (geminiSession) geminiSession.close();
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Aura AI Backend' });
});

const server = app.listen(PORT, () => {
    console.log(`Aura backend running on ${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
