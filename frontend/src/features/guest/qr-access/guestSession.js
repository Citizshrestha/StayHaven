// Shared anonymous-guest session identity for the QR ordering flow.
// This value is both a socket room key and a server-side ownership check
// (order.guestSessionId), so it must be unguessable — never fall back to
// Math.random(), which is predictable and not suitable as a security token.

const generateSecureId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // crypto.randomUUID() requires a secure context (HTTPS/localhost) and is
  // supported in all modern browsers; getRandomValues() has broader support
  // as a fallback and is still cryptographically strong.
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // No Web Crypto API available at all (very old browser, non-secure
  // context). This should be unreachable in practice; throwing surfaces the
  // problem instead of silently minting a guessable identity.
  throw new Error('Secure random generation is unavailable in this browser context');
};

export const getOrCreateGuestSessionId = () => {
  let sessionId = localStorage.getItem('guestSessionId');
  if (!sessionId) {
    sessionId = `GUEST-${generateSecureId()}`;
    localStorage.setItem('guestSessionId', sessionId);
  }
  return sessionId;
};

// Idempotency keys are per-submission (one per order attempt), unlike the
// session id which is stable for the guest's whole visit.
export const generateIdempotencyKey = () => `idem-${generateSecureId()}`;
