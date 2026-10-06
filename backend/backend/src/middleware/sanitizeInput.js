// Removes the keys that turn request data into database operators or into prototype pollution.
//
//  - Keys starting with "$" ({"email": {"$ne": null}}) are MongoDB query operators; no endpoint of
//    this API accepts them from a client, so they are dropped from the body, query string and URL
//    parameters before any controller sees them.
//  - "__proto__", "constructor" and "prototype" are dropped so `Object.assign(doc, req.body)` and
//    similar merges cannot reach Object.prototype.
//
// Values are never rewritten, only these keys are removed, so ordinary data is untouched.

const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 24;

const clean = (value, depth = 0) => {
  if (value === null || typeof value !== 'object') return value;
  if (depth > MAX_DEPTH) return Array.isArray(value) ? [] : {};
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) value[i] = clean(value[i], depth + 1);
    return value;
  }
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || BLOCKED_KEYS.has(key)) {
      delete value[key];
    } else {
      value[key] = clean(value[key], depth + 1);
    }
  }
  return value;
};

const sanitizeInput = (req, res, next) => {
  if (req.body) clean(req.body);
  if (req.query) clean(req.query);
  if (req.params) clean(req.params);
  next();
};

module.exports = sanitizeInput;
module.exports.clean = clean;
