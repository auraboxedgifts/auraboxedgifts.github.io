const { SYSTEM_PROMPT } = require('./systemPrompt');
const { mobileToolDeclarations } = require('./mobileTools');
const {
    buildHampersShowcase,
    buildGiftsShowcase,
    buildProductShowcase,
    buildSearchShowcase,
    showcaseMobileAction
} = require('./mobileShowcase');

const MOBILE_MODEL = process.env.GEMINI_MOBILE_MODEL || 'gemini-3.5-flash';

function buildMobileCatalogContext(getCatalog, getSite, getSettings) {
    const products = getCatalog().slice(0, 50);
    const hampers = (getSite().hampers || []).slice(0, 10);
    const shipping = getSettings().shippingFlatRate;
    const productLines = products
        .map((p) => `id=${p.id} | ${p.name} | ${p.collection} | ₹${p.price}`)
        .join('\n');
    const hamperLines = hampers
        .map((h) => `id=${h.id} | ${h.title} | ₹${Number(h.price) || 0}`)
        .join('\n');
    return [
        'MOBILE APP CATALOG (use exact ids and prices):',
        productLines || 'No products.',
        '',
        'HAMPERS:',
        hamperLines || 'None',
        '',
        `Flat shipping: ₹${shipping} when cart is not empty.`
    ].join('\n');
}

function normalizeHistory(history) {
    if (!Array.isArray(history)) return [];
    return history
        .slice(-10)
        .map((entry) => ({
            role: entry.role === 'assistant' || entry.role === 'model' ? 'model' : 'user',
            text: String(entry.content || entry.text || '').trim()
        }))
        .filter((entry) => entry.text.length > 0);
}

function toolCallToAction(name, args, ctx) {
    const { getCatalog, getSite, getSellable } = ctx;
    switch (name) {
        case 'show_hampers':
            return showcaseMobileAction(buildHampersShowcase(getSite, args.query));
        case 'show_gifts':
            return showcaseMobileAction(buildGiftsShowcase(getCatalog, args.query, args.collection));
        case 'navigate_shop':
            return { type: 'navigate_shop' };
        case 'navigate_cart':
            return { type: 'navigate_cart' };
        case 'navigate_account':
            return { type: 'navigate_account' };
        case 'navigate_checkout':
            return { type: 'navigate_checkout' };
        case 'view_product': {
            const productId = String(args.productId || '');
            const showcase = buildProductShowcase(getSellable, productId, args.productName);
            return showcase
                ? showcaseMobileAction(showcase)
                : { type: 'view_product', productId, productName: String(args.productName || '') };
        }
        case 'add_to_cart':
            return {
                type: 'add_to_cart',
                productId: String(args.productId || ''),
                productName: String(args.productName || ''),
                qty: Math.max(1, Number(args.qty || 1))
            };
        case 'search_products':
            return showcaseMobileAction(buildSearchShowcase(getCatalog, getSite, args.query));
        default:
            return null;
    }
}

async function chatWithMobileAura({
    apiKey,
    message,
    history,
    cartContext,
    screen,
    getCatalog,
    getSite,
    getSettings,
    getSellable
}) {
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');
    const trimmed = String(message || '').trim();
    if (!trimmed) throw new Error('Message is required.');

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const catalogContext = buildMobileCatalogContext(getCatalog, getSite, getSettings);
    const prior = normalizeHistory(history);
    const cartNote = cartContext
        ? `Customer cart: ${cartContext.itemCount || 0} items, subtotal ₹${cartContext.subtotal || 0}, shipping ₹${cartContext.shipping || 0}, total ₹${cartContext.total || 0}.`
        : 'Customer cart: unknown (app will sync).';
    const screenNote = screen ? `Current app screen: ${screen}.` : '';

    const systemInstruction = `${SYSTEM_PROMPT}\n\n${catalogContext}\n\n${cartNote}\n${screenNote}\n\nYou are Aura AI inside the Aura Boxed Gifts Android app. Use show_hampers and show_gifts to present gifts on the Aura AI screen instead of navigating away. Keep replies short and warm (under 90 words). Call tools when the customer asks to browse, see cart, checkout, or add items. Never invent product ids — use ids from the catalog above.`;

    const contents = [
        ...prior.map((entry) => ({
            role: entry.role,
            parts: [{ text: entry.text }]
        })),
        { role: 'user', parts: [{ text: trimmed }] }
    ];

    const toolCtx = {
        getCatalog,
        getSite,
        getSellable: getSellable || ((id) => {
            const product = getCatalog().find((p) => p.id === id);
            if (product) return product;
            const hamper = (getSite().hampers || []).find((h) => h.id === id);
            if (hamper && Number(hamper.price) > 0) {
                return { id: hamper.id, name: hamper.title, image: hamper.image, price: Number(hamper.price) };
            }
            return null;
        })
    };

    const response = await ai.models.generateContent({
        model: MOBILE_MODEL,
        contents,
        config: {
            systemInstruction,
            tools: [{ functionDeclarations: mobileToolDeclarations }],
            temperature: 0.7,
            maxOutputTokens: 512
        }
    });

    const actions = [];
    const functionCalls = response.functionCalls || [];
    for (const call of functionCalls) {
        const action = toolCallToAction(call.name, call.args || {}, toolCtx);
        if (action) actions.push(action);
    }

    let reply = String(response.text || '').trim();
    if (!reply && actions.length) {
        reply = 'Here you go — I’ve pulled those up for you on screen.';
    }
    if (!reply && !actions.length) {
        throw new Error('Aura AI returned an empty response. Please try again.');
    }

    return { reply, actions, model: MOBILE_MODEL };
}

module.exports = { chatWithMobileAura };
