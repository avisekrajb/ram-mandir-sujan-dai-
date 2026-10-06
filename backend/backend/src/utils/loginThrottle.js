// Counts FAILED sign-ins per account (e-mail address), whatever address they come from, so that a
// password cannot be guessed by spreading the guesses over many machines. Only failures count: a
// person who signs in correctly is never slowed down, and a correct sign-in clears the account's
// count. The temple keeps one process, so memory is enough (a restart clears it: acceptable).
//
// Trade-off to know about: someone who knows an address can make its owner wait out the window by
// failing on purpose. The window is short and nothing is revealed; the owner can still use Google
// or the e-mail code, and a super admin can restart the server or use scripts/resetAdminPassword.js.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const MAX_KEYS = 50000;

const failures = new Map();

const keyOf = (email) => String(email || '').toLowerCase().trim().slice(0, 254);

const liveEntry = (key) => {
  const entry = failures.get(key);
  if (!entry) return null;
  if (entry.resetAt <= Date.now()) {
    failures.delete(key);
    return null;
  }
  return entry;
};

// Seconds the account must wait, or 0 when sign-in is allowed.
const lockedForSeconds = (email) => {
  const entry = liveEntry(keyOf(email));
  if (!entry || entry.count < MAX_FAILURES) return 0;
  return Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000));
};

const recordFailure = (email) => {
  const key = keyOf(email);
  if (!key) return;
  let entry = liveEntry(key);
  if (!entry) {
    if (failures.size >= MAX_KEYS) failures.delete(failures.keys().next().value);
    entry = { count: 0, resetAt: Date.now() + WINDOW_MS };
    failures.set(key, entry);
  }
  entry.count += 1;
};

const clearFailures = (email) => {
  failures.delete(keyOf(email));
};

module.exports = { lockedForSeconds, recordFailure, clearFailures, MAX_FAILURES, WINDOW_MS };
