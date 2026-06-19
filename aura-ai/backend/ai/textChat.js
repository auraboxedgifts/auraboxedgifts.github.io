const { SYSTEM_PROMPT } = require('./systemPrompt');

const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash';

function buildCatalogContext(getCatalog, getSite) {
    const products = getCatalog().slice(0, 40);
    const collections = [...new Set(products.map((p) => p.collection).filter(Boolean))];
    const hampers = (getSite().hampers || []).slice(0, 12);
    const productLines = products
        .map((p) => `- ${p.name} (${p.collection}) ₹${p.price}`)
        .join('\n');
    const hamperLines = hampers
        .map((h, i) => `${i + 1}. ${h.title}${Number(h.price) > 0 ? ` — ₹${h.price}` : ''}`)
        .join('\n');
    return [
        'LIVE CATALOG (use exact names and prices):',
        productLines || 'No products loaded.',
        '',
        'COLLECTIONS:',
        collections.join(', ') || 'None',
        '',
        'TRENDING HAMPERS:',
        hamperLines || 'No hampers configured.',
        '',
        'Shipping: flat rate from store settings when cart is not empty. Currency: INR.'
    ].join('\n');
}

function normalizeHistory(history) {
    if (!Array.isArray(history)) return [];
    return history
        .slice(-12)
        .map((entry) => ({
            role: entry.role === 'assistant' || entry.role === 'model' ? 'model' : 'user',
            text: String(entry.content || entry.text || '').trim()
        }))
        .filter((entry) => entry.text.length > 0);
}

async function chatWithAura({ apiKey, message, history, getCatalog, getSite }) {
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured on the server.');
    }
    const trimmed = String(message || '').trim();
    if (!trimmed) {
        throw new Error('Message is required.');
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const catalogContext = buildCatalogContext(getCatalog, getSite);
    const prior = normalizeHistory(history);

    const contents = [
        ...prior.map((entry) => ({
            role: entry.role,
            parts: [{ text: entry.text }]
        })),
        { role: 'user', parts: [{ text: trimmed }] }
    ];

    const response = await ai.models.generateContent({
        model: CHAT_MODEL,
        contents,
        config: {
            systemInstruction: `${SYSTEM_PROMPT}\n\n${catalogContext}\n\nYou are in TEXT CHAT mode on aura.devshubh.me. Reply in warm, concise paragraphs. Use bullet points for gift ideas. Never invent prices — use the live catalog above. Mention hampers for occasion gifting. Keep replies under 120 words unless the user asks for detail.`,
            temperature: 0.75,
            maxOutputTokens: 512
        }
    });

    const reply = String(response.text || '').trim();
    if (!reply) {
        throw new Error('Aura AI returned an empty response. Please try again.');
    }
    return { reply, model: CHAT_MODEL };
}

function buildSuggestions(getCatalog, getSite) {
    const collections = [...new Set(getCatalog().map((p) => p.collection).filter(Boolean))].slice(0, 4);
    const hampers = (getSite().hampers || []).slice(0, 2);
    const suggestions = [
        'Suggest a birthday gift under ₹500',
        'What hampers do you offer?',
        'Show me hair accessories',
        'Help me pick a wedding hamper'
    ];
    if (collections[0]) {
        suggestions[2] = `What is popular in ${collections[0]}?`;
    }
    if (hampers[0]) {
        suggestions[1] = `Tell me about the ${hampers[0].title} hamper`;
    }
    return suggestions;
}

module.exports = {
    buildCatalogContext,
    buildSuggestions,
    chatWithAura
};
