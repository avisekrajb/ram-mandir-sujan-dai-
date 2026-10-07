// frontend/src/services/auth.js

// Token management
export const getToken = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    localStorage.setItem('token', token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

export const removeToken = () => {
  try {
    localStorage.removeItem('token');
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// User management
export const getUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const setUser = (user) => {
  try {
    localStorage.setItem('user', JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user:', error);
  }
};

export const removeUser = () => {
  try {
    localStorage.removeItem('user');
  } catch (error) {
    console.error('Error removing user:', error);
  }
};

// Language management

// Marks a language the visitor picked themselves, which must never be
// overridden by geo-detection on a later visit.
const LANGUAGE_CHOSEN_KEY = 'lang_user_set';

export const getLanguage = () => {
  try {
    return localStorage.getItem('lang') || 'en';
  } catch {
    return 'en';
  }
};

/**
 * Read the stored language, distinguishing "never set" from "set by me".
 * Returns null when nothing has been stored, which is the signal that
 * geo-detection should choose.
 */
export const getStoredLanguage = () => {
  try {
    return localStorage.getItem('lang');
  } catch {
    return null;
  }
};

export const hasUserChosenLanguage = () => {
  try {
    return localStorage.getItem(LANGUAGE_CHOSEN_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Persist the language.
 * `userChosen` records intent so an explicit choice sticks. Auto-detected
 * values are stored without setting that flag.
 */
export const setLanguage = (lang, { userChosen = false } = {}) => {
  try {
    localStorage.setItem('lang', lang);
    if (userChosen) {
      localStorage.setItem(LANGUAGE_CHOSEN_KEY, '1');
    }
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Check if user is logged in
export const isLoggedIn = () => {
  try {
    return !!localStorage.getItem('token') && !!localStorage.getItem('user');
  } catch {
    return false;
  }
};

// Raised on `window` when the server says the saved login is no longer valid.
export const SESSION_ENDED_EVENT = 'auth:session-ended';

// Raised on `window` when the account is signed in but suspended for a while:
// the login is still good, the person just may not leave the home page.
export const ACCOUNT_RESTRICTED_EVENT = 'auth:account-restricted';

// The code the backend uses for that (see middleware/restricted.js).
export const RESTRICTED_CODE = 'ACCOUNT_RESTRICTED';

/**
 * Is this signed-in person currently held to the home page? Mirrors the server
 * rule: suspended, and the suspension has an end time that has not passed yet.
 * A suspension with no end time is a lock-out, and the saved login is dropped
 * instead - see isSessionEndedError.
 */
export const isRestrictedUser = (user, now = Date.now()) =>
  Boolean(
    user &&
    user.active === false &&
    user.role !== 'superadmin' &&
    user.suspendedUntil &&
    new Date(user.suspendedUntil).getTime() > now
  );

/** The API refused a call because of a timed suspension. */
export const isRestrictedError = (error) =>
  Boolean(error?.response?.status === 403 && error?.response?.data?.code === RESTRICTED_CODE);

// The auth middleware tags every "this login is over" 401 with one of these.
// Anything else (a 5xx, a timeout, the backend restarting, a wrong password on
// the login form) must never cost a person their saved login.
const SESSION_ENDED_CODES = [
  'NO_TOKEN',
  'TOKEN_INVALID',
  'TOKEN_EXPIRED',
  'USER_NOT_FOUND',
  'ACCOUNT_SUSPENDED',
  'SESSION_REVOKED',
];

export const isSessionEndedError = (error) => {
  const res = error && error.response;
  if (!res || res.status !== 401) return false;
  const code = res.data && res.data.code;
  if (code) return SESSION_ENDED_CODES.includes(code);
  // Responses from a backend that predates the codes: trust only the auth
  // middleware's own wording, not any 401 (e.g. "Invalid credentials").
  return /^Not authorized/i.test((res.data && res.data.message) || '');
};

// Ask the browser not to evict the saved login when it is short on storage.
export const requestPersistentStorage = () => {
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch {
    /* best effort */
  }
};

// Clear all auth data
export const clearAuthData = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};