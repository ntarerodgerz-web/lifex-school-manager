/**
 * API Rate Limiter Middleware
 * ─────────────────────────────────────────────
 * In-memory sliding-window rate limiter for API key requests.
 * Uses the rate_limit value from the API key record.
 *
 * Window: 1 minute (60 000 ms)
 * Default limit: 100 requests/minute per API key
 *
 * Headers returned:
 *   X-RateLimit-Limit     — max requests per window
 *   X-RateLimit-Remaining — remaining requests in current window
 *   X-RateLimit-Reset     — timestamp when the window resets
 */

// In-memory store: { [keyId]: { count, windowStart } }
const store = new Map();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store) {
    if (now - val.windowStart > 120000) {
      store.delete(key);
    }
  }
}, 300000);

const WINDOW_MS = 60000; // 1 minute

const apiRateLimiter = (req, res, next) => {
  if (!req.apiKey) return next(); // Not an API-key request

  const keyId = req.apiKey.id;
  const limit = req.apiKey.rate_limit || 100;
  const now = Date.now();

  let entry = store.get(keyId);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // Start a new window
    entry = { count: 1, windowStart: now };
    store.set(keyId, entry);
  } else {
    entry.count += 1;
  }

  const remaining = Math.max(0, limit - entry.count);
  const reset = new Date(entry.windowStart + WINDOW_MS).toISOString();

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', reset);

  if (entry.count > limit) {
    return res.status(429).json({
      success: false,
      message: `Rate limit exceeded. Max ${limit} requests per minute. Try again after ${reset}.`,
    });
  }

  next();
};

module.exports = apiRateLimiter;

