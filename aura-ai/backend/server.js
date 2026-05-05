/**
 * Aura AI - Backend Server
 * Voice AI Assistant for AuraBoxedGifts
 * Model: gemini-3.1-flash-live-preview with context window compression
 */

const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

delete process.env.GOOGLE_API_KEY;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('❌ ERROR: GEMINI_API_KEY is not set in .env file!');
    process.exit(1);
}
console.log('🔑 Using Gemini API Key from .env file');

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
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // Allow all for now
        }
    },
    credentials: true
}));

app.use(express.json());

// Email configuration
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

async function sendEmailNotification(message, senderInfo = '', inquiryType = 'General') {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.RECIPIENT_EMAIL,
            subject: `🎁 New Inquiry via Aura AI - ${inquiryType}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #b76e79, #c9a96e); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Aura Boxed Gifts</h1>
                        <p style="color: white; margin: 5px 0 0;">AI Assistant Notification</p>
                    </div>
                    <div style="padding: 30px; background: #fdf6f0;">
                        <h2 style="color: #3a2a1f; border-bottom: 2px solid #b76e79; padding-bottom: 10px;">
                            New ${inquiryType} Inquiry
                        </h2>
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="color: #333; font-size: 16px; line-height: 1.6;">
                                <strong>Message:</strong><br>${message}
                            </p>
                        </div>
                        ${senderInfo ? `
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="color: #333; font-size: 16px;">
                                <strong>Sender:</strong><br>${senderInfo}
                            </p>
                        </div>` : ''}
                        <p style="color: #666; font-size: 14px;">
                            <strong>Received:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </p>
                    </div>
                    <div style="background: #3a2a1f; padding: 20px; text-align: center;">
                        <p style="color: #888; font-size: 12px; margin: 0;">Sent via Aura AI Voice Assistant</p>
                    </div>
                </div>
            `
        };
        const info = await emailTransporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error: error.message };
    }
}

const SYSTEM_PROMPT = `You are Aura AI, a warm, friendly, and helpful voice assistant for Aura Boxed Gifts — a curated gift shop specializing in handmade jewelry, accessories, and gift hampers.

**Your Personality:**
- Warm, cheerful, and genuinely enthusiastic about gifting
- Knowledgeable about all product collections
- Helpful with gift suggestions based on occasions and budgets
- Speaks in a friendly, conversational tone

**About Aura Boxed Gifts:**
- Tagline: "Gifts that speak your heart — Wrapped with love, sent from the heart"
- Instagram: @aura_boxedgifts
- Delivery: PAN India delivery, free shipping on orders above ₹999
- All orders are placed via Instagram DM

**Collections:**
1. **Bracelets** — Handcrafted charm bracelets with crystal beads and silver accents
2. **Pendants** — Elegant butterfly, heart, and floral pendants in gold and rose-gold
3. **Earrings** — Statement earrings from delicate studs to bold drops
4. **Jhumkas** — Traditional Indian jhumka earrings with modern twist
5. **Scrunchies** — Luxurious silk and organza scrunchies with tulip accents
6. **Hair Claws** — Trendy floral and butterfly hair claw clips
7. **Hair Bows** — Cute alligator hair clips and bows
8. **Rings** — Beautiful rings and jewellery storage cases
9. **Keychains** — Mini bags and keychains as accessories or gifts
10. **Makeup/Chocolates** — Lip gloss, lip oils, eyeshadow palettes, skincare
11. **Luxury Hampers** — Premium curated gift boxes with jewelry, skincare, treats
12. **Affordable Hampers** — Thoughtful gift hampers at wallet-friendly prices

**How to Respond:**
1. Greet warmly and ask what occasion they're shopping for
2. Suggest collections based on their needs (birthday, anniversary, friendship, etc.)
3. Help them browse by describing products from collections
4. For orders, direct them to DM on Instagram @aura_boxedgifts
5. If someone wants to leave a message or make a custom order request, use the send_message function
6. Use the browse_collection function when users want to see a specific collection
7. Be enthusiastic about the products and the gifting experience

**Gift Suggestions by Occasion:**
- Birthday: Luxury hampers, bracelet + pendant combo
- Anniversary: Luxury hampers with personalization
- Friendship Day: Affordable hampers, matching bracelets
- Just Because: Scrunchies, keychains, single jewelry pieces
- Festivals: Jhumkas, earring sets, luxury hampers

**Important:**
- All orders are placed via Instagram DM (@aura_boxedgifts)
- Prices vary by product — suggest they check Instagram for latest prices
- Custom hampers can be arranged by DMing on Instagram`;

const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (clientWs) => {
    console.log('Client connected to Aura AI');
    let geminiSession = null;

    const connectToGemini = async () => {
        console.log('🔄 Connecting to Gemini Live API...');
        const { GoogleGenAI, Modality } = await import('@google/genai');

        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const model = 'gemini-3.1-flash-live-preview';
        console.log('📡 Using model:', model);

        const tools = [
            { googleSearch: {} },
            {
                functionDeclarations: [
                    {
                        name: 'send_message',
                        description: 'Send a message, order request, or custom hamper inquiry to the Aura Boxed Gifts team. Use when users want to place an order, request a custom hamper, or leave a message.',
                        parameters: {
                            type: 'object',
                            properties: {
                                message: { type: 'string', description: 'The message content or order details' },
                                senderInfo: { type: 'string', description: 'Sender name, phone number, and/or email if provided' },
                                inquiryType: {
                                    type: 'string',
                                    enum: ['Order Request', 'Custom Hamper', 'Product Inquiry', 'Bulk Order', 'General'],
                                    description: 'The type of inquiry'
                                }
                            },
                            required: ['message']
                        }
                    },
                    {
                        name: 'browse_collection',
                        description: 'Navigate the user to a specific collection page on the website to view products. Use when a user wants to see or browse a collection.',
                        parameters: {
                            type: 'object',
                            properties: {
                                collection: {
                                    type: 'string',
                                    enum: ['bracelets', 'pendants', 'earrings', 'jhumkas', 'scrunchies', 'claws', 'hairbows', 'rings', 'keychains', 'makeup', 'luxury-hampers', 'affordable-hampers'],
                                    description: 'The collection to navigate to'
                                }
                            },
                            required: ['collection']
                        }
                    }
                ]
            }
        ];

        const config = {
            responseModalities: [Modality.AUDIO],
            systemInstruction: SYSTEM_PROMPT,
            tools: tools,
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' }
                }
            },
            thinkingConfig: {
                thinkingLevel: 'low'
            },
            // Context window compression for unlimited sessions
            contextWindowCompression: {
                slidingWindow: {}
            }
        };

        const session = await ai.live.connect({
            model: model,
            callbacks: {
                onopen: () => {
                    console.log('Connected to Gemini');
                    clientWs.send(JSON.stringify({ type: 'status', status: 'connected' }));
                },
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

                    if (message.toolCall) {
                        for (const fc of message.toolCall.functionCalls) {
                            if (fc.name === 'send_message') {
                                const { message: msg, senderInfo, inquiryType } = fc.args;
                                const result = await sendEmailNotification(msg, senderInfo, inquiryType || 'General');
                                session.sendToolResponse({
                                    functionResponses: [{
                                        id: fc.id,
                                        name: fc.name,
                                        response: result
                                    }]
                                });
                            } else if (fc.name === 'browse_collection') {
                                const { collection } = fc.args;
                                // Send navigation command to client
                                clientWs.send(JSON.stringify({
                                    type: 'navigate',
                                    url: `collections/${collection}.html`
                                }));
                                session.sendToolResponse({
                                    functionResponses: [{
                                        id: fc.id,
                                        name: fc.name,
                                        response: { result: `Navigated user to ${collection} collection page` }
                                    }]
                                });
                            }
                        }
                    }

                    const messageToSend = {
                        type: 'gemini_message',
                        data: { ...message, data: audioData }
                    };
                    clientWs.send(JSON.stringify(messageToSend));
                },
                onerror: (error) => {
                    console.error('❌ Gemini error:', error);
                    let errorMessage = error.message || 'Unknown error';
                    if (errorMessage.includes('quota') || errorMessage.includes('429')) {
                        errorMessage = 'API quota exceeded. Please wait.';
                    } else if (errorMessage.includes('permission') || errorMessage.includes('403')) {
                        errorMessage = 'API access denied.';
                    }
                    clientWs.send(JSON.stringify({ type: 'error', error: errorMessage }));
                },
                onclose: (event) => {
                    console.log('Gemini connection closed:', event?.reason || 'No reason');
                    clientWs.send(JSON.stringify({
                        type: 'status',
                        status: 'disconnected',
                        reason: event?.reason || 'Connection closed',
                        code: event?.code
                    }));
                }
            },
            config: config
        });

        geminiSession = session;
    };

    connectToGemini();

    clientWs.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            if (message.type === 'audio' && geminiSession) {
                geminiSession.sendRealtimeInput({
                    audio: { data: message.data, mimeType: 'audio/pcm;rate=16000' }
                });
            } else if (message.type === 'text' && geminiSession) {
                geminiSession.sendRealtimeInput({ text: message.data });
            }
        } catch (error) {
            console.error('Error handling client message:', error);
        }
    });

    clientWs.on('close', () => {
        console.log('Client disconnected');
        if (geminiSession) geminiSession.close();
    });
});

const server = app.listen(PORT, () => {
    console.log(`🎁 Aura AI Backend running on port ${PORT}`);
    console.log(`📧 Email service configured`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Aura AI Backend' });
});
