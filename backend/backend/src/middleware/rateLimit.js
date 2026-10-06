// Minimal in-memory, per-IP fixed-window rate limiter for sensitive auth
// endpoints (login, OTP, password reset). Single-process only: if the API is
// ever run as several instances, swap this for a shared store.
// `keyGenerator(req)` may return a different bucket key (e.g. an account instead of an address);
// a falsy key skips the limit for that request. `maxKeys` caps the table so a flood of distinct
// keys cannot grow it without bound.
const net = require('net');

// One IPv6 customer owns a whole /64 (billions of addresses): counting each address separately would let a client
// rotate through them for free, so an IPv6 address is counted by its /64. IPv4-mapped addresses count as IPv4.
const ipKey = (ip) => {
  const raw = String(ip || '').split('%')[0];
  if (!raw) return 'unknown';
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(raw);
  if (mapped) return mapped[1];
  if (!net.isIPv6(raw)) return raw;
  const [head, tail] = raw.split('::');
  const h = head ? head.split(':') : [];
  const t = tail === undefined ? [] : tail ? tail.split(':') : [];
  const full = tail === undefined ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t];
  return `${full.slice(0, 4).map((x) => x.toLowerCase().replace(/^0+(?=.)/, '')).join(':')}::/64`;
};

const rateLimit = ({ windowMs, max, message, keyGenerator, maxKeys = 50000 }) => {
  const hits = new Map();

  // Drop expired windows so the map does not grow without bound.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = keyGenerator ? keyGenerator(req) : ipKey(req.ip || req.socket?.remoteAddress);
    if (!key) return next();
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (!entry && hits.size >= maxKeys) hits.delete(hits.keys().next().value);
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests. Please try again later.',
      });
    }
    next();
  };
};

module.exports = rateLimit;
