const { mobileToolDeclarations } = require('./mobileTools');
const {
    buildHampersShowcase,
    buildGiftsShowcase,
    buildProductShowcase,
    buildSearchShowcase,
    showcaseMobileAction
} = require('./mobileShowcase');

const MOBILE_LIVE_KICKOFF =
    '[SYSTEM NOTE: The customer just opened Aura AI Voice in the Aura Boxed Gifts Android app. Greet them warmly in one short sentence and ask how you can help with gifts or hampers.]';

function buildMobileLiveInstruction(getCatalog, getSite, getSettings) {
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
        'You are Aura AI — a warm voice shopping assistant for Aura Boxed Gifts inside the Android app.',
        'Speak naturally in short sentences. Use mobile tools to help shop.',
        'When the customer wants to SEE hampers or gifts, call show_hampers or show_gifts — cards appear on the Aura AI screen. Do NOT navigate to the shop for browsing.',
        'Use navigate_cart, navigate_checkout, navigate_account only when they ask to open those screens.',
        'Never invent product ids — use ids from the catalog below.',
        '',
        'MOBILE CATALOG:',
        productLines || 'No products.',
        '',
        'HAMPERS:',
        hamperLines || 'None',
        '',
        `Flat shipping: ₹${shipping} when cart is not empty.`
    ].join('\n');
}

function sendShowcase(clientWs, showcase) {
    clientWs.send(
        JSON.stringify({
            type: 'mobile_action',
            action: showcaseMobileAction(showcase)
        })
    );
}

async function executeMobileLiveTool(fc, clientWs, ctx) {
    const {
        getCatalog,
        getSite,
        getSellable,
        resolveProductId,
        lastViewedProduct,
        requestCartTotalsFromClient,
        formatCartTotalsMessage,
        calculateCart,
        sleep
    } = ctx;
    const args = fc.args || {};
    const name = fc.name;
    let response = { result: 'ok' };
    let viewed = null;

    switch (name) {
        case 'show_hampers': {
            const showcase = buildHampersShowcase(getSite, args.query);
            sendShowcase(clientWs, showcase);
            response = {
                result: showcase.items.length
                    ? `Showing ${showcase.items.length} hampers on screen`
                    : 'No hampers matched that filter'
            };
            break;
        }
        case 'show_gifts': {
            const showcase = buildGiftsShowcase(getCatalog, args.query, args.collection);
            sendShowcase(clientWs, showcase);
            response = {
                result: showcase.items.length
                    ? `Showing ${showcase.items.length} gifts on screen`
                    : 'No gifts matched that filter'
            };
            break;
        }
        case 'navigate_shop':
            clientWs.send(JSON.stringify({ type: 'mobile_action', action: { type: 'navigate_shop' } }));
            response = { result: 'Opened shop' };
            break;
        case 'navigate_cart':
            clientWs.send(JSON.stringify({ type: 'mobile_action', action: { type: 'navigate_cart' } }));
            response = { result: 'Opened cart' };
            break;
        case 'navigate_account':
            clientWs.send(JSON.stringify({ type: 'mobile_action', action: { type: 'navigate_account' } }));
            response = { result: 'Opened account' };
            break;
        case 'navigate_checkout':
            clientWs.send(JSON.stringify({ type: 'mobile_action', action: { type: 'navigate_checkout' } }));
            response = { result: 'Opened checkout' };
            break;
        case 'view_product': {
            const productId = String(args.productId || resolveProductId(args, lastViewedProduct) || '');
            if (productId) {
                const sellable = getSellable(productId);
                viewed = {
                    productId,
                    productName: args.productName || sellable?.name || '',
                    productPrice: Number(sellable?.price || 0)
                };
                const showcase = buildProductShowcase(getSellable, productId, viewed.productName);
                if (showcase) {
                    sendShowcase(clientWs, showcase);
                    response = { result: `Showing ${viewed.productName || productId} on screen` };
                } else {
                    response = { result: 'Could not find that product id' };
                }
            } else {
                response = { result: 'Could not find that product id' };
            }
            break;
        }
        case 'add_to_cart': {
            const productId = String(args.productId || resolveProductId(args, lastViewedProduct) || '');
            const sellable = productId ? getSellable(productId) : null;
            const qty = Math.max(1, Number(args.qty || 1));
            clientWs.send(JSON.stringify({
                type: 'mobile_action',
                action: {
                    type: 'add_to_cart',
                    productId,
                    productName: args.productName || sellable?.name || '',
                    qty
                }
            }));
            try {
                await sleep(450);
                const payload = await requestCartTotalsFromClient(clientWs);
                const cart = payload?.cart || calculateCart(payload?.items || []);
                response = {
                    result: `Added ${args.productName || sellable?.name || 'item'}. ${formatCartTotalsMessage(cart)}`,
                    productId,
                    grandTotal: cart.grandTotal
                };
            } catch (err) {
                response = {
                    result: `Added ${args.productName || sellable?.name || 'item'}.`,
                    productId,
                    error: err.message
                };
            }
            break;
        }
        case 'search_products': {
            const showcase = buildSearchShowcase(getCatalog, getSite, args.query);
            sendShowcase(clientWs, showcase);
            response = {
                result: showcase.items.length
                    ? `Showing ${showcase.items.length} matches on screen`
                    : `No matches for ${args.query || 'that search'}`
            };
            break;
        }
        case 'calculate_cart_total':
            try {
                const payload = await requestCartTotalsFromClient(clientWs);
                const cart = payload?.cart || calculateCart(payload?.items || []);
                response = {
                    result: formatCartTotalsMessage(cart),
                    subtotal: cart.subtotal,
                    shipping: cart.shipping,
                    grandTotal: cart.grandTotal
                };
            } catch (err) {
                response = { result: 'Could not read cart.', error: err.message };
            }
            break;
        default:
            response = { result: `Unknown tool ${name}` };
    }

    return { response, lastViewedProduct: viewed || lastViewedProduct };
}

module.exports = {
    mobileToolDeclarations,
    MOBILE_LIVE_KICKOFF,
    buildMobileLiveInstruction,
    executeMobileLiveTool
};
