/**
 * Idempotency Key Middleware
 *
 * Prevents duplicate mutations (double-click check-in, network retry, etc.)
 * Client sends `X-Idempotency-Key: <unique-uuid>` header.
 * Server caches the result for that key and replays it if the same key
 * is received again within the TTL window.
 *
 * In-memory store with TTL sweep. For multi-instance deployments,
 * swap the Map for Redis.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SWEEP_INTERVAL_MS = 60 * 1000;  // sweep every minute

class IdempotencyStore {
  constructor(ttl = DEFAULT_TTL_MS) {
    this.ttl = ttl;
    /** @type {Map<string, { status: string, response: object|null, statusCode: number, expiresAt: number }>} */
    this.cache = new Map();

    // Periodic sweep of expired entries
    this._sweepTimer = setInterval(() => this._sweep(), SWEEP_INTERVAL_MS);
    if (this._sweepTimer.unref) this._sweepTimer.unref(); // don't hold process open
  }

  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  get(key) {
    return this.cache.get(key) || null;
  }

  /** Mark key as "processing" — locks it so concurrent duplicates are rejected */
  lock(key) {
    this.cache.set(key, {
      status: "processing",
      response: null,
      statusCode: 0,
      expiresAt: Date.now() + this.ttl,
    });
  }

  /** Store the completed response for replay */
  complete(key, statusCode, responseBody) {
    this.cache.set(key, {
      status: "completed",
      response: responseBody,
      statusCode,
      expiresAt: Date.now() + this.ttl,
    });
  }

  _sweep() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) this.cache.delete(key);
    }
  }
}

const store = new IdempotencyStore();

/**
 * Express middleware.
 * Apply to POST / PATCH / PUT routes that are mutation-critical.
 */
export const idempotencyGuard = (req, res, next) => {
  const key = req.headers["x-idempotency-key"];

  // No key provided → pass through (idempotency is opt-in)
  if (!key) return next();

  // Key already exists
  if (store.has(key)) {
    const entry = store.get(key);

    if (entry.status === "processing") {
      // Another request with this key is still in flight
      return res.status(409).json({
        success: false,
        message: "This operation is already being processed. Please wait.",
        idempotencyKey: key,
      });
    }

    if (entry.status === "completed") {
      // Replay the cached response
      return res.status(entry.statusCode).json(entry.response);
    }
  }

  // First time seeing this key — lock it
  store.lock(key);

  // Monkey-patch res.json to capture the response
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    store.complete(key, res.statusCode, body);
    return originalJson(body);
  };

  next();
};

export default idempotencyGuard;
