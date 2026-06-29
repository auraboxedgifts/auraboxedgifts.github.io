/**
 * Aura AI - Voice Assistant Widget
 * For AuraBoxedGifts
 */

const _auraHost = window.location.hostname;
const _auraIsLocalHost = _auraHost === 'localhost' || _auraHost === '127.0.0.1';

function getAuraWsUrl() {
    let base = '';
    if (window.AURA_AI_WS_URL) {
        base = window.AURA_AI_WS_URL;
    } else if (window.AuraApi && window.AuraApi.API_BASE) {
        base = window.AuraApi.API_BASE.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
    } else {
        base = _auraIsLocalHost ? 'ws://localhost:5013' : 'wss://aura.devshubh.me';
    }
    const params = [];
    if (window.AuraAuth && typeof window.AuraAuth.getUser === 'function') {
        const u = window.AuraAuth.getUser();
        if (u) {
            if (u.name) params.push('name=' + encodeURIComponent(u.name));
            if (u.email) params.push('email=' + encodeURIComponent(u.email));
        }
    }
    if (params.length > 0) {
        const joiner = base.indexOf('?') !== -1 ? '&' : '?';
        base += joiner + params.join('&');
    }
    return base;
}

let auraWs = null;
let auraGeminiReady = false;
let auraAudioContext = null;
let auraMicrophone = null;
let auraProcessor = null;
let auraIsConnected = false;
let auraIsListening = false;
let auraAudioQueue = [];
let auraIsPlaying = false;

let auraVisualizerContext = null;
let auraAnalyser = null;
let auraDataArray = null;
let auraBufferLength = null;

let auraIsMuted = false;

let auraPlaybackContext = null;
let auraNextPlayTime = 0;
let auraScheduledSources = [];

const auraIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

let auraWidgetPanel, auraWidgetText, auraMuteBtn, auraSpeakerBtn, auraEndBtn, auraOrb, auraVisualizer;
let auraPendingCollectionCommand = null;

let auraAudioDevices = [];
let auraCurrentDeviceIndex = 0;

async function initAuraAudioDevices() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        auraAudioDevices = devices.filter(d => d.kind === 'audiooutput');
    } catch (err) {
        console.warn('[AuraAI] enumerateDevices error:', err);
    }
}

async function handleAuraSpeakerToggle(e) {
    e.stopPropagation();
    if (!auraPlaybackContext) return;
    if (auraAudioDevices.length === 0) {
        await initAuraAudioDevices();
    }
    if (auraAudioDevices.length <= 1) {
        const spkDefault = auraSpeakerBtn.querySelector('.speaker-default');
        const spkAlt = auraSpeakerBtn.querySelector('.speaker-alternative');
        if (spkDefault.style.display === 'none') {
            spkDefault.style.display = 'block';
            spkAlt.style.display = 'none';
        } else {
            spkDefault.style.display = 'none';
            spkAlt.style.display = 'block';
        }
        return;
    }
    auraCurrentDeviceIndex = (auraCurrentDeviceIndex + 1) % auraAudioDevices.length;
    const device = auraAudioDevices[auraCurrentDeviceIndex];
    try {
        if (auraPlaybackContext.setSinkId) {
            await auraPlaybackContext.setSinkId(device.deviceId);
            console.log('[AuraAI] Switched audio output sink to:', device.label || device.deviceId);
        }
    } catch (err) {
        console.error('[AuraAI] Failed to set sink ID:', err);
    }
    
    const spkDefault = auraSpeakerBtn.querySelector('.speaker-default');
    const spkAlt = auraSpeakerBtn.querySelector('.speaker-alternative');
    if (auraCurrentDeviceIndex === 0) {
        spkDefault.style.display = 'block';
        spkAlt.style.display = 'none';
    } else {
        spkDefault.style.display = 'none';
        spkAlt.style.display = 'block';
    }
}

function createAuraAIWidget() {
    const widgetHTML = `
    <div class="aura-ai-widget" id="auraAIWidget">
        <div class="aura-mini-cart" id="auraMiniCart"></div>
        <div class="aura-widget-panel" id="auraWidgetPanel">
            <div class="aura-visualizer-container">
                <canvas id="auraVisualizer" width="50" height="50"></canvas>
                <div class="aura-orb" id="auraOrb">
                    <div class="aura-orb-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                            <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="aura-widget-content">
                <div class="aura-widget-text" id="auraWidgetText">
                    Talk to <span>Aura AI</span>
                </div>
                <button class="aura-mute-btn" id="auraMuteBtn" style="display: none;" title="Mute microphone">
                    <svg class="mic-on" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                    <svg class="mic-off" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                </button>
                <button class="aura-speaker-btn" id="auraSpeakerBtn" style="display: none;" title="Switch audio source">
                    <svg class="speaker-default" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                    <svg class="speaker-alternative" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                        <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                    </svg>
                </button>
                <button class="aura-end-btn" id="auraEndBtn" style="display: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <span>End</span>
                </button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', widgetHTML);

    auraWidgetPanel = document.getElementById('auraWidgetPanel');
    auraWidgetText = document.getElementById('auraWidgetText');
    auraMuteBtn = document.getElementById('auraMuteBtn');
    auraSpeakerBtn = document.getElementById('auraSpeakerBtn');
    auraEndBtn = document.getElementById('auraEndBtn');
    auraOrb = document.getElementById('auraOrb');
    auraVisualizer = document.getElementById('auraVisualizer');

    // Mini cart: show/hide on cart updates
    setupAuraMiniCart();
}

// ─── Mini Cart Summary Logic ───
let auraMiniCartTimer = null;
function setupAuraMiniCart() {
    // Listen for cart changes via storage events and message broadcasts
    window.addEventListener('storage', function(e) {
        if (e.key === 'aura_cart_v2') refreshAuraMiniCart();
    });
    // Also hook into updateQtyById broadcasts
    window.addEventListener('message', function(e) {
        if (e.data && (e.data.type === 'cartUpdated' || e.data.type === 'bounceBadge')) {
            refreshAuraMiniCart();
        }
    });
    // Periodic check for cart changes (catches addToCart calls from same page)
    let lastCartStr = localStorage.getItem('aura_cart_v2') || '[]';
    setInterval(function() {
        const cur = localStorage.getItem('aura_cart_v2') || '[]';
        if (cur !== lastCartStr) {
            lastCartStr = cur;
            refreshAuraMiniCart();
        }
    }, 400);
}

async function refreshAuraMiniCart() {
    const panel = document.getElementById('auraMiniCart');
    if (!panel) return;
    const cart = JSON.parse(localStorage.getItem('aura_cart_v2') || '[]');
    if (!cart.length) {
        panel.classList.remove('show');
        return;
    }
    try {
        const calc = await AuraApi.apiFetch('/api/cart/calculate', {
            method: 'POST',
            body: JSON.stringify({ items: cart.map(i => ({ productId: i.productId, qty: i.qty })) })
        });
        const lines = calc.data?.lines || [];
        if (!lines.length) { panel.classList.remove('show'); return; }
        const totalItems = lines.reduce((s, l) => s + l.qty, 0);
        const itemsHtml = lines.map(l => `
            <div class="aura-mini-cart-item">
                <img src="${AuraApi.resolveAssetPath(l.image || '')}" alt="${l.name}" onerror="this.style.display='none'">
                <div class="aura-mini-cart-item-info">
                    <div class="aura-mini-cart-item-name">${l.name}</div>
                    <div class="aura-mini-cart-item-price">₹${l.unitPrice}</div>
                </div>
                <div class="aura-mini-cart-item-qty">x${l.qty}</div>
            </div>`).join('');

        panel.innerHTML = `
            <div class="aura-mini-cart-header">
                <h4>🛒 Your Cart</h4>
                <span class="aura-mini-cart-count">${totalItems} item${totalItems > 1 ? 's' : ''}</span>
            </div>
            <div class="aura-mini-cart-items">${itemsHtml}</div>
            <div class="aura-mini-cart-footer">
                <div class="aura-mini-cart-totals">
                    <span>Total</span>
                    <span class="aura-mini-cart-total-val">₹${calc.data.grandTotal}.00</span>
                </div>
                <button class="aura-mini-cart-checkout" id="auraMiniCartCheckout">Checkout</button>
            </div>`;
        panel.querySelector('#auraMiniCartCheckout').addEventListener('click', function(e) {
            e.stopPropagation();
            panel.classList.remove('show');
            if (window.AuraCheckout && typeof window.AuraCheckout.openCheckoutPage === 'function') {
                window.AuraCheckout.openCheckoutPage();
            } else if (typeof openCheckoutPage === 'function') {
                openCheckoutPage();
            }
        });
        panel.classList.add('show');
        clearTimeout(auraMiniCartTimer);
        auraMiniCartTimer = setTimeout(function() { panel.classList.remove('show'); }, 8000);
    } catch (err) {
        console.warn('[AuraMiniCart] calc error:', err);
    }
}

function initAuraAI() {
    createAuraAIWidget();
    setupAuraVisualizerCanvas();
    setupAuraEventListeners();
}

function setupAuraVisualizerCanvas() {
    auraVisualizer.width = 50;
    auraVisualizer.height = 50;
    auraVisualizerContext = auraVisualizer.getContext('2d');
}

function setupAuraEventListeners() {
    auraWidgetPanel.addEventListener('click', handleAuraWidgetClick);
    auraMuteBtn.addEventListener('click', handleAuraMuteToggle);
    auraSpeakerBtn.addEventListener('click', handleAuraSpeakerToggle);
    auraEndBtn.addEventListener('click', handleAuraEndClick);
}

async function handleAuraWidgetClick(e) {
    if (e.target.closest('.aura-end-btn') || e.target.closest('.aura-mute-btn')) return;
    if (!auraIsConnected) await handleAuraStartClick();
}

function handleAuraMuteToggle(e) {
    e.stopPropagation();
    auraIsMuted = !auraIsMuted;
    const micOnIcon = auraMuteBtn.querySelector('.mic-on');
    const micOffIcon = auraMuteBtn.querySelector('.mic-off');
    if (auraIsMuted) {
        micOnIcon.style.display = 'none';
        micOffIcon.style.display = 'block';
        auraMuteBtn.classList.add('muted');
        auraMuteBtn.title = 'Unmute microphone';
    } else {
        micOnIcon.style.display = 'block';
        micOffIcon.style.display = 'none';
        auraMuteBtn.classList.remove('muted');
        auraMuteBtn.title = 'Mute microphone';
    }
}

async function connectToAuraBackend() {
    return new Promise((resolve, reject) => {
        let settled = false;
        const startupTimeout = setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error('Aura AI took too long to start. Check server logs and GEMINI_API_KEY.'));
        }, 30000);

        function finishOk() {
            if (settled) return;
            settled = true;
            clearTimeout(startupTimeout);
            auraIsConnected = true;
            resolve();
        }

        function finishErr(err) {
            if (settled) return;
            settled = true;
            clearTimeout(startupTimeout);
            reject(err);
        }

        try {
            auraGeminiReady = false;
            const wsUrl = getAuraWsUrl();
            console.log('[AuraAI] Connecting WebSocket:', wsUrl);
            auraWs = new WebSocket(wsUrl);

            auraWs.onopen = () => {
                console.log('[AuraAI] WebSocket open — waiting for Gemini Live…');
                updateAuraStatus('Starting Aura AI…');
            };

            auraWs.onmessage = async (event) => {
                let message;
                try {
                    message = JSON.parse(event.data);
                } catch (parseErr) {
                    console.error('[AuraAI] Bad WS message:', parseErr);
                    return;
                }
                handleAuraBackendMessage(message);

                if (message.type === 'status' && message.status === 'connected') {
                    auraGeminiReady = true;
                    finishOk();
                }
                if (message.type === 'error') {
                    finishErr(new Error(message.error || 'Aura AI error'));
                }
            };

            auraWs.onerror = () => {
                console.error('[AuraAI] WebSocket error');
                updateAuraStatus('Connection Error', 'error');
                finishErr(new Error('Could not reach Aura AI server. WebSocket failed — check nginx proxy for Upgrade headers.'));
            };

            auraWs.onclose = () => {
                console.log('[AuraAI] WebSocket closed');
                auraIsConnected = false;
                auraGeminiReady = false;
                auraIsListening = false;
                if (!settled) {
                    finishErr(new Error('Aura AI connection closed before ready'));
                } else {
                    updateAuraStatus('Disconnected', 'error');
                }
                stopAuraMicrophone();
            };
        } catch (error) {
            finishErr(error);
        }
    });
}

function openAuraHamperFromMessage(message, attempt) {
    const maxAttempts = 25;
    const retryMs = 200;
    attempt = attempt || 0;

    const el = document.getElementById('trending-hampers');
    if (el) el.scrollIntoView({ behavior: 'smooth' });

    if (!window.AuraHampers) {
        if (attempt < maxAttempts) setTimeout(() => openAuraHamperFromMessage(message, attempt + 1), retryMs);
        return;
    }

    const list = window.AuraHampers.list();
    if (!list.length) {
        if (attempt < maxAttempts) setTimeout(() => openAuraHamperFromMessage(message, attempt + 1), retryMs);
        return;
    }

    let opened = false;
    if (message.hamperId) opened = window.AuraHampers.openById(message.hamperId);
    if (!opened && message.title) opened = window.AuraHampers.openByTitle(message.title);
    if (!opened && typeof message.index === 'number') opened = window.AuraHampers.openByIndex(message.index);

    if (!opened && attempt < maxAttempts) {
        setTimeout(() => openAuraHamperFromMessage(message, attempt + 1), retryMs);
    }
}

function handleAuraBackendMessage(message) {
    switch (message.type) {
        case 'status':
            if (message.status === 'connecting') updateAuraStatus('Starting Aura AI…');
            else if (message.status === 'connected') updateAuraStatus('Ready', 'connected');
            else if (message.status === 'disconnected') {
                updateAuraStatus('Disconnected', 'error');
                auraIsConnected = false;
                auraGeminiReady = false;
            }
            break;
        case 'gemini_message':
            handleAuraGeminiMessage(message.data);
            break;
        case 'navigate':
            // Open collection page in overlay so AI doesn't disconnect
            if (message.url) {
                const overlay = document.getElementById('collection-overlay');
                const iframe = document.getElementById('collection-iframe');
                if (overlay && overlay.style.display === 'block' && iframe && iframe.src) {
                    try {
                        iframe.contentWindow.postMessage({ type: 'append_collection', url: message.url }, '*');
                    } catch (err) {
                        console.error('[AuraAI] Failed to post append_collection:', err);
                        openCollectionOverlay(message.url);
                    }
                } else {
                    openCollectionOverlay(message.url);
                }
            }
            break;
        case 'navigate_home':
            closeCollectionOverlay();
            break;
        case 'next_product':
        case 'previous_product': {
            var navIframe = document.getElementById('collection-iframe');
            if (navIframe && navIframe.contentWindow) {
                navIframe.contentWindow.postMessage({ type: message.type }, '*');
            }
            break;
        }
        case 'view_product': {
            var viewIframe = document.getElementById('collection-iframe');
            if (viewIframe && viewIframe.contentWindow) {
                auraPendingCollectionCommand = { type: 'view_product', index: message.index || 1 };
                try {
                    viewIframe.contentWindow.postMessage(auraPendingCollectionCommand, '*');
                } catch (err) {}
            }
            break;
        }
        case 'add_to_cart':
            if (message.productId && window.AuraCart && typeof window.AuraCart.addToCartById === 'function') {
                window.AuraCart.addToCartById(message.productId);
                if (auraWs && auraWs.readyState === WebSocket.OPEN) {
                    auraWs.send(JSON.stringify({
                        type: 'context_update',
                        productId: message.productId,
                        productName: message.productName,
                        productPrice: message.productPrice,
                        action: 'added_to_cart'
                    }));
                }
            } else if (typeof addToCart === 'function') {
                addToCart({ item: message.productName, price: message.productPrice, img: window._lastViewedProductImg || '' });
                if (auraWs && auraWs.readyState === WebSocket.OPEN) {
                    auraWs.send(JSON.stringify({ type: 'context_update', productName: message.productName, productPrice: message.productPrice, action: 'added_to_cart' }));
                }
            }
            break;
        case 'calculate_cart_total':
            handleAuraCalculateCartTotal(message.requestId);
            break;
        case 'open_checkout':
            if (window.AuraCheckout && typeof window.AuraCheckout.openCheckoutPage === 'function') {
                window.AuraCheckout.openCheckoutPage();
            } else if (typeof openCheckoutPage === 'function') {
                openCheckoutPage();
            }
            break;
        case 'show_cart': {
            if (window.AuraCart && typeof window.AuraCart.openCartPage === 'function') {
                window.AuraCart.openCartPage();
            } else if (typeof openCartPage === 'function') openCartPage();
            break;
        }
        case 'open_login':
            if (window.AuraAuth && typeof window.AuraAuth.openAuthModal === 'function') {
                window.AuraAuth.openAuthModal();
            }
            break;
        case 'auth_enter_email': {
            // Voice auth: fill email and submit
            if (window.AuraAuth && typeof window.AuraAuth.openAuthModal === 'function') {
                window.AuraAuth.openAuthModal();
            }
            setTimeout(function() {
                const modal = document.getElementById('auraAuthModal');
                if (!modal) return;
                const emailInput = modal.querySelector('#authEmailInput');
                if (emailInput && message.email) {
                    emailInput.value = message.email;
                    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                    // Click Continue
                    setTimeout(function() {
                        const btn = modal.querySelector('#authContinueBtn');
                        if (btn) btn.click();
                    }, 300);
                }
            }, 500);
            break;
        }
        case 'auth_enter_otp': {
            const modal = document.getElementById('auraAuthModal');
            if (modal && message.otp) {
                const otpInput = modal.querySelector('#authOtpInput');
                if (otpInput) {
                    otpInput.value = message.otp;
                    otpInput.dispatchEvent(new Event('input', { bubbles: true }));
                    setTimeout(function() {
                        const btn = modal.querySelector('#authVerifyOtpBtn');
                        if (btn) btn.click();
                    }, 300);
                }
            }
            break;
        }
        case 'auth_enter_password': {
            const modal = document.getElementById('auraAuthModal');
            if (modal && message.password) {
                const pwInput = modal.querySelector('#authPasswordInput');
                if (pwInput) {
                    pwInput.value = message.password;
                    pwInput.dispatchEvent(new Event('input', { bubbles: true }));
                    setTimeout(function() {
                        const btn = modal.querySelector('#authPasswordLoginBtn');
                        if (btn) btn.click();
                    }, 300);
                }
            }
            break;
        }
        case 'view_hamper':
            closeCollectionOverlay();
            setTimeout(() => openAuraHamperFromMessage(message), 350);
            break;
        case 'scroll_to_section':
            closeCollectionOverlay(); // Ensure we are on the main page
            setTimeout(() => {
                const sectionMap = {
                    'home': 'home',
                    'hampers': 'trending-hampers',
                    'trending-hampers': 'trending-hampers',
                    'collections': 'collections',
                    'gallery': 'gallery',
                    'about': 'about',
                    'contact': 'contact'
                };
                const targetId = sectionMap[message.section];
                if (targetId) {
                    const el = document.getElementById(targetId);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
            break;
        case 'error':
            console.error('[AuraAI] Server error:', message.error);
            updateAuraStatus(message.error || 'Error', 'error');
            break;
    }
}

async function handleAuraCalculateCartTotal(requestId) {
    if (!requestId || !auraWs || auraWs.readyState !== WebSocket.OPEN) return;
    try {
        const items = window.AuraCart && typeof window.AuraCart.getItems === 'function'
            ? window.AuraCart.getItems()
            : [];
        const calc = await AuraApi.apiFetch('/api/cart/calculate', {
            method: 'POST',
            body: JSON.stringify({ items: items.map((i) => ({ productId: i.productId, qty: i.qty || 1 })) })
        });
        auraWs.send(JSON.stringify({
            type: 'cart_totals_response',
            requestId,
            items,
            cart: calc.data || calc
        }));
    } catch (err) {
        console.error('[AuraAI] cart totals error:', err);
        auraWs.send(JSON.stringify({
            type: 'cart_totals_response',
            requestId,
            items: [],
            cart: { lines: [], subtotal: 0, shipping: 0, grandTotal: 0, currency: 'INR', error: err.message }
        }));
    }
}

function handleAuraGeminiMessage(data) {
    if (data.data) addAuraAudioToQueue(data.data);
    if (data.serverContent) {
        if (data.serverContent.interrupted) {
            stopAuraAudioPlayback();
            updateAuraStatus('Listening...');
        }
        if (data.serverContent.turnComplete) {
            auraOrb.classList.remove('speaking');
            auraOrb.classList.add('listening');
        }
    }
}

async function startAuraMicrophone() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Browser does not support microphone access.');
        }
        auraAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
        });
        auraMicrophone = auraAudioContext.createMediaStreamSource(stream);
        auraAnalyser = auraAudioContext.createAnalyser();
        auraAnalyser.fftSize = 256;
        auraBufferLength = auraAnalyser.frequencyBinCount;
        auraDataArray = new Uint8Array(auraBufferLength);
        auraMicrophone.connect(auraAnalyser);
        auraProcessor = auraAudioContext.createScriptProcessor(4096, 1, 1);
        auraMicrophone.connect(auraProcessor);
        auraProcessor.connect(auraAudioContext.destination);
        auraProcessor.onaudioprocess = (e) => {
            if (!auraIsListening || !auraWs || auraWs.readyState !== WebSocket.OPEN || auraIsMuted) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = convertAuraToPCM16(inputData);
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData)));
            auraWs.send(JSON.stringify({ type: 'audio', data: base64Audio }));
        };
        auraIsListening = true;
        startAuraVisualization();
        updateAuraStatus('Listening...', 'listening');
        auraOrb.classList.add('listening');
    } catch (error) {
        console.error('Microphone error:', error);
        updateAuraStatus('Mic Error', 'error');
    }
}

function stopAuraMicrophone() {
    if (auraProcessor) { auraProcessor.disconnect(); auraProcessor = null; }
    if (auraMicrophone) {
        auraMicrophone.disconnect();
        auraMicrophone.mediaStream.getTracks().forEach(track => track.stop());
        auraMicrophone = null;
    }
    if (auraAudioContext) { auraAudioContext.close(); auraAudioContext = null; }
    auraIsListening = false;
    auraOrb.classList.remove('listening', 'speaking');
}

function convertAuraToPCM16(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
}

function addAuraAudioToQueue(base64Audio) {
    auraAudioQueue.push(base64Audio);
    if (!auraIsPlaying) processAuraAudioQueue();
}

async function initAuraPlaybackContext() {
    if (!auraPlaybackContext || auraPlaybackContext.state === 'closed') {
        auraPlaybackContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 24000,
            latencyHint: auraIsMobile ? 'playback' : 'interactive'
        });
        auraNextPlayTime = 0;
    }
    if (auraPlaybackContext.state === 'suspended') await auraPlaybackContext.resume();
    return auraPlaybackContext;
}

async function processAuraAudioQueue() {
    if (auraAudioQueue.length === 0) {
        if (auraScheduledSources.length > 0 && auraPlaybackContext) {
            const currentTime = auraPlaybackContext.currentTime;
            if (auraScheduledSources.some(item => item.endTime > currentTime)) {
                setTimeout(() => processAuraAudioQueue(), 50);
                return;
            }
        }
        auraIsPlaying = false;
        auraOrb.classList.remove('speaking');
        auraOrb.classList.add('listening');
        updateAuraStatus('Listening...');
        return;
    }
    auraIsPlaying = true;
    auraOrb.classList.remove('listening');
    auraOrb.classList.add('speaking');
    updateAuraStatus('Speaking...');
    await initAuraPlaybackContext();
    const base64Audio = auraAudioQueue.shift();
    try {
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const audioBuffer = auraPlaybackContext.createBuffer(1, bytes.length / 2, 24000);
        const channelData = audioBuffer.getChannelData(0);
        const dataView = new DataView(bytes.buffer);
        for (let i = 0; i < channelData.length; i++) {
            channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
        }
        scheduleAuraAudioBuffer(audioBuffer);
    } catch (error) { console.error('Audio decode error:', error); }
    setTimeout(() => processAuraAudioQueue(), 5);
}

function scheduleAuraAudioBuffer(audioBuffer) {
    if (!auraPlaybackContext || auraPlaybackContext.state === 'closed') return;
    const source = auraPlaybackContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(auraPlaybackContext.destination);
    const currentTime = auraPlaybackContext.currentTime;
    if (auraNextPlayTime <= currentTime) auraNextPlayTime = currentTime + 0.01;
    const scheduleTime = auraNextPlayTime;
    try { source.start(scheduleTime); } catch (e) { return; }
    const endTime = scheduleTime + audioBuffer.duration;
    auraScheduledSources.push({ source, endTime });
    auraNextPlayTime = endTime;
    auraScheduledSources = auraScheduledSources.filter(item => item.endTime > currentTime);
}

function stopAuraAudioPlayback() {
    auraAudioQueue = [];
    auraIsPlaying = false;
    auraScheduledSources.forEach(item => { try { item.source.stop(); } catch (e) {} });
    auraScheduledSources = [];
    if (auraPlaybackContext) auraNextPlayTime = auraPlaybackContext.currentTime;
}

function startAuraVisualization() {
    function draw() {
        if (!auraIsListening) { auraVisualizerContext.clearRect(0, 0, 50, 50); return; }
        requestAnimationFrame(draw);
        if (auraIsMuted) { auraVisualizerContext.clearRect(0, 0, 50, 50); return; }
        auraAnalyser.getByteFrequencyData(auraDataArray);
        auraVisualizerContext.clearRect(0, 0, 50, 50);
        const centerX = 25, centerY = 25, radius = 22, bars = 20;
        for (let i = 0; i < bars; i++) {
            const angle = (i / bars) * Math.PI * 2;
            const dataIndex = Math.floor((i / bars) * auraBufferLength);
            const height = (auraDataArray[dataIndex] / 255) * 8;
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + height);
            const y2 = centerY + Math.sin(angle) * (radius + height);
            const gradient = auraVisualizerContext.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, '#b76e79');
            gradient.addColorStop(0.5, '#d4919b');
            gradient.addColorStop(1, '#c9a96e');
            auraVisualizerContext.strokeStyle = gradient;
            auraVisualizerContext.lineWidth = 2;
            auraVisualizerContext.lineCap = 'round';
            auraVisualizerContext.beginPath();
            auraVisualizerContext.moveTo(x1, y1);
            auraVisualizerContext.lineTo(x2, y2);
            auraVisualizerContext.stroke();
        }
    }
    draw();
}

function updateAuraStatus(text) {
    const plain = ['Listening...', 'Speaking...', 'Connected', 'Ready', 'Connecting...', 'Starting Aura AI…'];
    if (plain.includes(text) || text.endsWith('…')) {
        auraWidgetText.innerHTML = text;
    } else if (text.includes('Error') || text === 'Disconnected' || text.includes('failed') || text.includes('Could not')) {
        auraWidgetText.innerHTML = `<span style="color: #ff6b6b;">${text}</span>`;
    } else {
        auraWidgetText.innerHTML = text;
    }
}

async function handleAuraStartClick() {
    try {
        updateAuraStatus('Connecting...');
        auraMuteBtn.style.display = 'none';
        auraSpeakerBtn.style.display = 'none';
        auraEndBtn.style.display = 'none';
        await initAuraPlaybackContext();
        await connectToAuraBackend();
        await startAuraMicrophone();
        updateAuraStatus('Listening...');
        auraMuteBtn.style.display = 'flex';
        auraSpeakerBtn.style.display = 'flex';
        auraEndBtn.style.display = 'flex';
    } catch (error) {
        console.error('Failed to start Aura AI:', error);
        updateAuraStatus('Error - Try again');
        auraMuteBtn.style.display = 'none';
        auraSpeakerBtn.style.display = 'none';
        auraEndBtn.style.display = 'none';
    }
}

function handleAuraEndClick(e) {
    e.stopPropagation();
    stopAuraMicrophone();
    stopAuraAudioPlayback();
    auraGeminiReady = false;
    if (auraWs) auraWs.close();
    if (auraPlaybackContext && auraPlaybackContext.state !== 'closed') {
        auraPlaybackContext.close();
        auraPlaybackContext = null;
    }
    auraOrb.classList.remove('listening', 'speaking');
    auraWidgetText.innerHTML = 'Talk to <span>Aura AI</span>';
    auraMuteBtn.style.display = 'none';
    auraSpeakerBtn.style.display = 'none';
    auraEndBtn.style.display = 'none';
    auraIsConnected = false;
    auraIsMuted = false;
    const micOnIcon = auraMuteBtn.querySelector('.mic-on');
    const micOffIcon = auraMuteBtn.querySelector('.mic-off');
    micOnIcon.style.display = 'block';
    micOffIcon.style.display = 'none';
    auraMuteBtn.classList.remove('muted');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuraAI);
} else {
    initAuraAI();
}

document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && auraIsConnected) {
        if (auraPlaybackContext && auraPlaybackContext.state === 'suspended') {
            try { await auraPlaybackContext.resume(); } catch (e) {}
        }
        if (auraAudioContext && auraAudioContext.state === 'suspended') {
            try { await auraAudioContext.resume(); } catch (e) {}
        }
    }
});

// --- Navigation Overlay Logic (Prevents session drop) ---
function openCollectionOverlay(url) {
    let overlay = document.getElementById('collection-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'collection-overlay';
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9990; background:var(--cream, #fdf6f0); display:none;';
        
        const iframe = document.createElement('iframe');
        iframe.id = 'collection-iframe';
        iframe.style.cssText = 'width:100%; height:100%; border:none;';
        iframe.addEventListener('load', function() {
            if (auraPendingCollectionCommand && iframe.contentWindow) {
                iframe.contentWindow.postMessage(auraPendingCollectionCommand, '*');
            }
        });
        overlay.appendChild(iframe);
        document.body.appendChild(overlay);
        
        window.addEventListener('message', function(e) {
            if (e.data === 'closeCollection') {
                closeCollectionOverlay();
            }
            if (e.data && e.data.type === 'context_update') {
                // Track the product image for AI add-to-cart
                if (e.data.productImg) {
                    window._lastViewedProductImg = e.data.productImg;
                }
                if (auraWs && auraWs.readyState === WebSocket.OPEN) {
                    auraWs.send(JSON.stringify(e.data));
                }
            }
            // addToCart and openCart are handled by cart.js — do NOT duplicate here
        });
    }
    // Only add ../ if it's not already there, depending on context
    var iframe = document.getElementById('collection-iframe');
    // Load from backend so newly created pages work immediately (before publishing to GitHub Pages)
    // Falls back to relative path (GitHub Pages) if backend doesn't serve it
    var resolvedUrl = url;
    var fallbackUrl = url;
    if (window.AuraApi && window.AuraApi.API_BASE) {
        resolvedUrl = window.AuraApi.API_BASE + '/' + url.replace(/^\/+/, '');
    }
    var loadAttempted = false;
    function onIframeLoad() {
        try {
            // Cross-origin iframes won't allow reading contentDocument — that's OK,
            // it means the backend served the page successfully.
            var doc = iframe.contentDocument || iframe.contentWindow.document;
            // If same-origin and the page title contains '404' or body is very small, fall back
            if (doc && !loadAttempted && (doc.title.indexOf('404') !== -1 || (doc.body && doc.body.textContent.trim().length < 50))) {
                loadAttempted = true;
                iframe.src = fallbackUrl;
            }
        } catch (e) {
            // Cross-origin — page loaded from backend, all good
        }
        iframe.removeEventListener('load', onIframeLoad);
    }
    if (resolvedUrl !== fallbackUrl) {
        iframe.addEventListener('load', onIframeLoad);
    }
    iframe.src = resolvedUrl;
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden'; // prevent background scrolling
    var slug = (url.split('/').pop() || '').replace('.html', '');
    if (window.location.hash.indexOf('#collection/') !== 0 || window.location.hash !== '#collection/' + slug) {
        history.pushState({ auraOverlay: 'collection', url: url }, '', '#collection/' + slug);
    }
}

function closeCollectionOverlay(skipHistory) {
    const overlay = document.getElementById('collection-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        document.getElementById('collection-iframe').src = '';
        document.body.style.overflow = '';
    }
    if (!skipHistory && window.location.hash.indexOf('#collection/') === 0) history.back();
}

// Intercept manual collection clicks
document.addEventListener('DOMContentLoaded', () => {
    // Only intercept if we are on the main page (not inside the iframe itself)
    if (window === window.parent) {
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a[href^="collections/"]');
            if (link) {
                e.preventDefault();
                openCollectionOverlay(link.getAttribute('href'));
            }
        });
    } else {
        // If we are inside the iframe, hide the AI widget as the parent already has it running
        const widget = document.getElementById('auraAIWidget');
        if (widget) widget.style.display = 'none';
    }
});

window.addEventListener('popstate', function() {
    const overlay = document.getElementById('collection-overlay');
    if (window.location.hash.indexOf('#collection/') !== 0 && overlay && overlay.style.display === 'block') {
        closeCollectionOverlay(true);
    } else if (window.location.hash.indexOf('#collection/') === 0) {
        const slug = window.location.hash.replace('#collection/', '');
        if (slug) openCollectionOverlay('collections/' + slug + '.html');
    }
});
