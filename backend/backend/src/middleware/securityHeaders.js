// Security response headers for the API (what `helmet` would set, kept here so there is no extra
// dependency to audit). The API only ever returns JSON, uploads and a few small HTML pages, so the
// default Content-Security-Policy is the strictest possible one: nothing may load, nothing may frame it.
// A route that renders its own HTML page (e.g. the reminder unsubscribe page) overrides the policy.

const API_CSP = "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const securityHeaders = ({ production = false } = {}) => (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Content-Security-Policy', API_CSP);
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  // Browsers must only talk to the API over HTTPS once they have seen it do so.
  if (production) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  // Responses to signed-in callers carry personal data: keep them out of shared and disk caches.
  if (req.headers.authorization) res.setHeader('Cache-Control', 'no-store');
  next();
};

module.exports = securityHeaders;
module.exports.API_CSP = API_CSP;
