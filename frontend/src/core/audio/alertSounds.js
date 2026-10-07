/**
 * alertSounds.js — self-contained notification sounds for the whole app.
 *
 * Why synthesized (Web Audio) instead of mp3 files:
 *  - The previous sounds were hot-linked from a third-party CDN (mixkit), which
 *    breaks offline, behind ad-blockers/CSP, or whenever the CDN changes, and
 *    the only local file (/sounds/notification.mp3) is a 322-byte placeholder.
 *  - Synthesized tones need no network, start instantly, and each event type
 *    gets a distinct, recognisable pattern.
 *
 * Browser autoplay: an AudioContext starts "suspended" until the user
 * interacts with the page. We resume it on the first click/tap/keypress and
 * expose the lock state so the UI can ask staff to enable alerts.
 *
 * Dedupe: the same sound type can't replay within DEDUPE_MS, so an event that
 * reaches several listeners (or several socket rooms) produces ONE sound.
 */

const DEDUPE_MS = 1500;

// Notes (Hz)
const C6 = 1046.5, E6 = 1318.5, G6 = 1568, A6 = 1760, A5 = 880;

// [frequency, startOffsetSec, durationSec, waveform?, gain?]
const PATTERNS = {
  // Bright ascending three-note chime, played twice — hard to miss.
  newOrder: {
    repeat: 2, gap: 0.95,
    notes: [[C6, 0, 0.5], [E6, 0.13, 0.5], [G6, 0.26, 0.75]],
  },
  // Two-note "ding-dong" bell.
  orderReady: {
    repeat: 2, gap: 0.85,
    notes: [[G6, 0, 0.6], [C6, 0.22, 0.8]],
  },
  // Urgent triple beep.
  waiterCall: {
    repeat: 2, gap: 0.7,
    notes: [[A5, 0, 0.14, 'triangle', 0.3], [A5, 0.18, 0.14, 'triangle', 0.3], [A5, 0.36, 0.18, 'triangle', 0.3]],
  },
  // Order status changed (preparing / delivered / confirmed): clear two-note
  // chime, louder than a message blip so staff actually notice it.
  statusUpdate: {
    repeat: 1, gap: 0,
    notes: [[A5, 0, 0.35, 'sine', 0.3], [E6, 0.14, 0.55, 'sine', 0.3]],
  },
  // Order cancelled: falling tones, played twice — "stop what you're doing".
  orderCancelled: {
    repeat: 2, gap: 0.75,
    notes: [[G6, 0, 0.22, 'triangle', 0.28], [C6, 0.2, 0.4, 'triangle', 0.28]],
  },
  // Soft two-note blip for messages / status updates.
  notification: {
    repeat: 1, gap: 0,
    notes: [[E6, 0, 0.25, 'sine', 0.18], [A6, 0.1, 0.35, 'sine', 0.18]],
  },
};

let ctx = null;
let master = null;
const lastPlayedAt = {};
const stateListeners = new Set();
let gestureHooked = false;

const notify = () => {
  const state = getAudioState();
  stateListeners.forEach((fn) => { try { fn(state); } catch { /* ignore */ } });
};

const getCtx = () => {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    ctx.onstatechange = notify;
  } catch {
    ctx = null;
  }
  return ctx;
};

/** 'running' | 'suspended' | 'unsupported' */
export function getAudioState() {
  const c = getCtx();
  if (!c) return 'unsupported';
  return c.state === 'running' ? 'running' : 'suspended';
}

/** Resume audio. Must be called from (or after) a user gesture to succeed. */
export async function unlockAudio() {
  const c = getCtx();
  if (!c) return false;
  if (c.state !== 'running') {
    try { await c.resume(); } catch { /* still locked */ }
  }
  notify();
  return c.state === 'running';
}

/** Subscribe to lock-state changes. Returns an unsubscribe function. */
export function onAudioStateChange(fn) {
  stateListeners.add(fn);
  return () => stateListeners.delete(fn);
}

/** Resume audio on the first user interaction anywhere on the page. */
export function installGestureUnlock() {
  if (gestureHooked || typeof document === 'undefined') return;
  gestureHooked = true;
  const handler = async () => {
    const ok = await unlockAudio();
    if (ok) {
      ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => document.removeEventListener(ev, handler, true));
    }
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, handler, { capture: true, passive: true }));
}

const scheduleTone = (c, freq, start, dur, type = 'sine', peak = 0.26) => {
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(env).connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.05);

  // Soft octave overtone gives sine tones a bell-like timbre.
  if (type === 'sine') {
    const over = c.createOscillator();
    const overEnv = c.createGain();
    over.type = 'sine';
    over.frequency.setValueAtTime(freq * 2, start);
    overEnv.gain.setValueAtTime(0.0001, start);
    overEnv.gain.exponentialRampToValueAtTime(peak * 0.22, start + 0.01);
    overEnv.gain.exponentialRampToValueAtTime(0.0001, start + dur * 0.6);
    over.connect(overEnv).connect(master);
    over.start(start);
    over.stop(start + dur + 0.05);
  }
};

/**
 * Play an alert sound.
 * @param {'newOrder'|'orderReady'|'statusUpdate'|'orderCancelled'|'waiterCall'|'notification'} type
 * @param {object} [opts]
 * @param {number} [opts.volume=0.8] 0..1
 * @param {boolean} [opts.force=false] bypass dedupe (e.g. "test sound")
 * @returns {boolean} true if the sound was scheduled
 */
export function playAlert(type = 'notification', { volume = 0.8, force = false } = {}) {
  const pattern = PATTERNS[type] || PATTERNS.notification;
  const now = Date.now();
  if (!force && lastPlayedAt[type] && now - lastPlayedAt[type] < DEDUPE_MS) return false;

  const c = getCtx();
  if (!c) return false;
  lastPlayedAt[type] = now;

  const schedule = () => {
    master.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), c.currentTime);
    const t0 = c.currentTime + 0.02;
    for (let r = 0; r < pattern.repeat; r += 1) {
      const offset = r * pattern.gap;
      pattern.notes.forEach(([freq, at, dur, wave, gain]) => scheduleTone(c, freq, t0 + offset + at, dur, wave, gain));
    }
  };

  if (c.state === 'running') {
    schedule();
    return true;
  }

  // Suspended: resume() succeeds only if the page already has user activation.
  // Play if it resumes promptly; otherwise surface the locked state to the UI.
  c.resume()
    .then(() => {
      if (c.state === 'running' && Date.now() - now < 3000) schedule();
      else notify();
    })
    .catch(() => notify());
  return false;
}
