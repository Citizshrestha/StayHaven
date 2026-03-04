/**
 * Call Sound Effects — Web Audio API (OscillatorNode)
 *
 * Uses direct oscillator synthesis for maximum reliability.
 * No WAV blobs, no Audio elements, no file loading.
 * Sounds play through the AudioContext destination (speakers).
 *
 * IMPORTANT: Call unlockAudio() from any user gesture (click/keydown)
 * at least once before sounds are needed. This resumes the AudioContext
 * so it can produce audio even outside of user gesture contexts
 * (e.g. when an incoming call arrives via socket).
 */

let audioCtx = null;
let dialState = null;
let ringState = null;
let _autoUnlockBound = false;

// Auto-unlock AudioContext on the very first user interaction so ring tones
// can play for the callee even before they explicitly touch the call UI.
function _autoUnlock() {
    try { unlockAudio(); } catch { /* */ }
    const events = ['pointerdown', 'keydown', 'click', 'touchstart'];
    events.forEach(e => document.removeEventListener(e, _autoUnlock, true));
    _autoUnlockBound = false;
}

if (typeof document !== 'undefined' && !_autoUnlockBound) {
    _autoUnlockBound = true;
    ['pointerdown', 'keydown', 'click', 'touchstart'].forEach(e =>
        document.addEventListener(e, _autoUnlock, true)
    );
}

function getCtx() {
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => { });
    }
    return audioCtx;
}

/**
 * Pre-unlock the AudioContext so future play calls succeed.
 * Must be called during a user gesture (click / keydown / tap).
 */
export function unlockAudio() {
    try {
        const ctx = getCtx();
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => { });
        }
        // Play a silent oscillator for 1 ms to fully unlock in all browsers
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.001);
    } catch { /* ignore */ }
}

// ─── Helpers ────────────────────────────────────────────────────────

function makeOsc(ctx, freq, gainNode) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gainNode);
    osc.start();
    return osc;
}

function safeStop(nodes) {
    if (!nodes) return;
    if (nodes.oscs) {
        nodes.oscs.forEach(o => {
            try { o.stop(); } catch { /* */ }
            try { o.disconnect(); } catch { /* */ }
        });
    }
    if (nodes.gain) {
        try { nodes.gain.disconnect(); } catch { /* */ }
    }
}

// ─── DIAL TONE (outgoing — caller hears this) ──────────────────────
// US ringback: 440 + 480 Hz, 2 s ON / 4 s OFF

export function startDialTone() {
    stopDialTone();
    try {
        const ctx = getCtx();
        // Force-resume — safe to call even if already running
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});

        const gain = ctx.createGain();
        gain.connect(ctx.destination);

        const osc1 = makeOsc(ctx, 440, gain);
        const osc2 = makeOsc(ctx, 480, gain);

        // Schedule a 2-on / 4-off pattern for ~2 minutes
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        for (let i = 0; i < 20; i++) {
            const t = now + i * 6;
            gain.gain.setValueAtTime(0.25, t);       // ON
            gain.gain.setValueAtTime(0.0, t + 2);    // OFF after 2 s
        }

        dialState = { oscs: [osc1, osc2], gain };
        console.log('[CallSounds] Dial tone started');
    } catch (e) {
        console.error('[CallSounds] Dial tone error:', e);
    }
}

export function stopDialTone() {
    safeStop(dialState);
    dialState = null;
}

// ─── RING TONE (incoming — callee hears this) ──────────────────────
// Telephone-style: two short bursts then silence, 3 s cycle

export function startRingTone() {
    stopRingTone();
    try {
        const ctx = getCtx();
        // Force-resume — safe to call even if already running
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});

        const gain = ctx.createGain();
        gain.connect(ctx.destination);

        const osc1 = makeOsc(ctx, 440, gain);
        const osc2 = makeOsc(ctx, 480, gain);

        // Schedule burst pattern for ~90 s
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        for (let i = 0; i < 30; i++) {
            const t = now + i * 3;
            // Burst 1: 0.0 s → 0.4 s
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.setValueAtTime(0.0, t + 0.4);
            // Burst 2: 0.6 s → 1.0 s
            gain.gain.setValueAtTime(0.35, t + 0.6);
            gain.gain.setValueAtTime(0.0, t + 1.0);
        }

        ringState = { oscs: [osc1, osc2], gain };
        console.log('[CallSounds] Ring tone started');
    } catch (e) {
        console.error('[CallSounds] Ring tone error:', e);
    }
}

export function stopRingTone() {
    safeStop(ringState);
    ringState = null;
}

// ─── CONNECTED CHIME ────────────────────────────────────────────────

export function playConnectedSound() {
    try {
        const ctx = getCtx();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});

        const gain = ctx.createGain();
        gain.connect(ctx.destination);

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.connect(gain);

        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(523.25, now);        // C5
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5

        gain.gain.setValueAtTime(0.30, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.40);

        osc.start(now);
        osc.stop(now + 0.40);
        console.log('[CallSounds] Connected chime');
    } catch { /* */ }
}

// ─── ENDED TONE ─────────────────────────────────────────────────────

export function playEndedSound() {
    try {
        const ctx = getCtx();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});

        const gain = ctx.createGain();
        gain.connect(ctx.destination);

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.connect(gain);

        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(493.88, now);        // B4
        osc.frequency.setValueAtTime(392.00, now + 0.15); // G4

        gain.gain.setValueAtTime(0.30, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.50);

        osc.start(now);
        osc.stop(now + 0.50);
        console.log('[CallSounds] Ended tone');
    } catch { /* */ }
}

// ─── STOP ALL ───────────────────────────────────────────────────────

export function stopAllCallSounds() {
    stopDialTone();
    stopRingTone();
}
