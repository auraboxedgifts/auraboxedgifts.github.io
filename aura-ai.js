/**
 * Aura AI - Voice Assistant Widget
 * For AuraBoxedGifts
 */

const _auraHost = window.location.hostname;
const _auraIsLocal = !_auraHost || _auraHost === 'localhost' || _auraHost === '127.0.0.1' || window.location.protocol === 'file:';
const AURA_AI_WS_URL = _auraIsLocal
    ? 'ws://localhost:5013'
    : 'wss://aura.devshubh.me';

let auraWs = null;
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

let auraWidgetPanel, auraWidgetText, auraMuteBtn, auraEndBtn, auraOrb, auraVisualizer;

function createAuraAIWidget() {
    const widgetHTML = `
    <div class="aura-ai-widget" id="auraAIWidget">
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
    auraEndBtn = document.getElementById('auraEndBtn');
    auraOrb = document.getElementById('auraOrb');
    auraVisualizer = document.getElementById('auraVisualizer');
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
        try {
            auraWs = new WebSocket(AURA_AI_WS_URL);
            auraWs.onopen = () => {
                console.log('Connected to Aura AI');
                updateAuraStatus('Connected', 'connected');
                auraIsConnected = true;
                resolve();
            };
            auraWs.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                handleAuraBackendMessage(message);
            };
            auraWs.onerror = (error) => {
                console.error('Aura AI WebSocket error:', error);
                updateAuraStatus('Connection Error', 'error');
                reject(error);
            };
            auraWs.onclose = () => {
                console.log('Disconnected from Aura AI');
                auraIsConnected = false;
                auraIsListening = false;
                updateAuraStatus('Disconnected', 'error');
                stopAuraMicrophone();
            };
        } catch (error) { reject(error); }
    });
}

function handleAuraBackendMessage(message) {
    switch (message.type) {
        case 'status':
            if (message.status === 'connected') updateAuraStatus('Ready', 'connected');
            break;
        case 'gemini_message':
            handleAuraGeminiMessage(message.data);
            break;
        case 'navigate':
            // Open collection page in overlay so AI doesn't disconnect
            if (message.url) {
                openCollectionOverlay(message.url);
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
        case 'add_to_cart':
            if (typeof addToCart === 'function') {
                addToCart({
                    item: message.productName,
                    price: message.productPrice,
                    img: window._lastViewedProductImg || ''
                });
                // Tell backend it was successful
                if (auraWs && auraWs.readyState === WebSocket.OPEN) {
                    auraWs.send(JSON.stringify({ type: 'context_update', productName: message.productName, productPrice: message.productPrice, action: 'added_to_cart' }));
                }
            }
            break;
        case 'show_cart': {
            var csb = document.getElementById('cartSidebar');
            var cov = document.getElementById('cartOverlay');
            if (csb && cov) {
                csb.classList.add('active');
                cov.classList.add('active');
            }
            break;
        }
        case 'scroll_to_section':
            closeCollectionOverlay(); // Ensure we are on the main page
            setTimeout(() => {
                const sectionMap = {
                    'home': 'home',
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
            console.error('Aura AI error:', message.error);
            updateAuraStatus('Error', 'error');
            break;
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
    if (['Listening...', 'Speaking...', 'Connected', 'Ready'].includes(text)) {
        auraWidgetText.innerHTML = text;
    } else if (text.includes('Error') || text === 'Disconnected') {
        auraWidgetText.innerHTML = `<span style="color: #ff6b6b;">${text}</span>`;
    } else {
        auraWidgetText.innerHTML = text;
    }
}

async function handleAuraStartClick() {
    try {
        updateAuraStatus('Connecting...');
        auraMuteBtn.style.display = 'none';
        auraEndBtn.style.display = 'none';
        await initAuraPlaybackContext();
        await connectToAuraBackend();
        await startAuraMicrophone();
        updateAuraStatus('Listening...');
        auraMuteBtn.style.display = 'flex';
        auraEndBtn.style.display = 'flex';
    } catch (error) {
        console.error('Failed to start Aura AI:', error);
        updateAuraStatus('Error - Try again');
        auraMuteBtn.style.display = 'none';
        auraEndBtn.style.display = 'none';
    }
}

function handleAuraEndClick(e) {
    e.stopPropagation();
    stopAuraMicrophone();
    stopAuraAudioPlayback();
    if (auraWs) auraWs.close();
    if (auraPlaybackContext && auraPlaybackContext.state !== 'closed') {
        auraPlaybackContext.close();
        auraPlaybackContext = null;
    }
    auraOrb.classList.remove('listening', 'speaking');
    auraWidgetText.innerHTML = 'Talk to <span>Aura AI</span>';
    auraMuteBtn.style.display = 'none';
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
            if (e.data && e.data.type === 'addToCart') {
                if (typeof addToCart === 'function') {
                    addToCart(e.data);
                }
            }
            if (e.data && e.data.type === 'openCart') {
                var cs = document.getElementById('cartSidebar');
                var co = document.getElementById('cartOverlay');
                if (cs && co) { cs.classList.add('active'); co.classList.add('active'); }
            }
        });
    }
    // Only add ../ if it's not already there, depending on context
    document.getElementById('collection-iframe').src = url;
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden'; // prevent background scrolling
}

function closeCollectionOverlay() {
    const overlay = document.getElementById('collection-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        document.getElementById('collection-iframe').src = '';
        document.body.style.overflow = '';
    }
}

// Intercept manual collection clicks
document.addEventListener('DOMContentLoaded', () => {
    // Only intercept if we are on the main page (not inside the iframe itself)
    if (window === window.parent) {
        document.querySelectorAll('a[href^="collections/"]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                openCollectionOverlay(this.getAttribute('href'));
            });
        });
    } else {
        // If we are inside the iframe, hide the AI widget as the parent already has it running
        const widget = document.getElementById('auraAIWidget');
        if (widget) widget.style.display = 'none';
    }
});
