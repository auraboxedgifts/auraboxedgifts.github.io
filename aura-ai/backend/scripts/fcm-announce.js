#!/usr/bin/env node
/**
 * Send FCM announcements to logged-in customers.
 *
 * Examples:
 *   node scripts/fcm-announce.js --title "Hello" --body "Check out our gifts"
 *   node scripts/fcm-announce.js --title "New drop" --body "Fresh hampers" --image https://example.com/pic.jpg
 *   node scripts/fcm-announce.js --product prod_abc123
 *   node scripts/fcm-announce.js --version 1.3.5
 *   node scripts/fcm-announce.js --digest
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const {
    broadcastToCustomers,
    sendNewProductsDigest,
    getFcmStats,
    initFirebase
} = require('../fcm');

const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');
const PUBLIC_BASE = String(process.env.PUBLIC_BASE_URL || 'https://aura.devshubh.me').replace(/\/+$/, '');

function readProducts() {
    try {
        return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    } catch (_) {
        return [];
    }
}

function resolveImageUrl(image) {
    const raw = String(image || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return `${PUBLIC_BASE}${raw}`;
    return `${PUBLIC_BASE}/${raw.replace(/^\/+/, '')}`;
}

function parseArgs(argv) {
    const args = { _: [] };
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token.startsWith('--')) {
            const key = token.slice(2);
            const next = argv[i + 1];
            if (!next || next.startsWith('--')) {
                args[key] = true;
            } else {
                args[key] = next;
                i += 1;
            }
        } else {
            args._.push(token);
        }
    }
    return args;
}

function usage() {
    console.log(`Usage:
  node scripts/fcm-announce.js --title "Title" --body "Message" [--image URL]
  node scripts/fcm-announce.js --product <productId>
  node scripts/fcm-announce.js --version <versionName>
  node scripts/fcm-announce.js --digest [--title ...] [--body ...] [--image URL]
  node scripts/fcm-announce.js --stats`);
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (args.stats) {
        initFirebase();
        console.log('[FCM] Stats:', getFcmStats());
        return;
    }

    if (args.digest) {
        const products = readProducts();
        const result = await sendNewProductsDigest(products, {
            title: args.title,
            body: args.body,
            imageUrl: args.image ? resolveImageUrl(args.image) : undefined
        });
        console.log('[FCM] Digest result:', result);
        process.exit(result.sent > 0 ? 0 : 1);
    }

    if (args.product) {
        const products = readProducts();
        const product = products.find((p) => p.id === args.product);
        if (!product) {
            console.error(`[FCM] Product not found: ${args.product}`);
            process.exit(1);
        }
        const title = args.title || `New: ${product.name}`;
        const price = product.price != null ? ` — ₹${product.price}` : '';
        const body = args.body || `Discover ${product.name}${price} at Aura Boxed Gifts.`;
        const imageUrl = resolveImageUrl(args.image || product.image);
        const result = await broadcastToCustomers({
            title,
            body,
            imageUrl,
            type: 'product_announcement'
        });
        console.log('[FCM] Product announcement result:', result);
        process.exit(result.sent > 0 ? 0 : 1);
    }

    if (args.version) {
        const version = String(args.version).trim();
        const title = args.title || `Aura app update ${version}`;
        const body = args.body || `Version ${version} is available with improvements. Open the app to explore.`;
        const result = await broadcastToCustomers({
            title,
            body,
            imageUrl: args.image ? resolveImageUrl(args.image) : '',
            type: 'app_version'
        });
        console.log('[FCM] Version announcement result:', result);
        process.exit(result.sent > 0 ? 0 : 1);
    }

    const title = String(args.title || '').trim();
    const body = String(args.body || '').trim();
    if (!title || !body) {
        usage();
        process.exit(1);
    }

    const result = await broadcastToCustomers({
        title,
        body,
        imageUrl: args.image ? resolveImageUrl(args.image) : '',
        type: 'broadcast'
    });
    console.log('[FCM] Broadcast result:', result);
    process.exit(result.sent > 0 ? 0 : 1);
}

main().catch((err) => {
    console.error('[FCM] Script failed:', err.message);
    process.exit(1);
});
