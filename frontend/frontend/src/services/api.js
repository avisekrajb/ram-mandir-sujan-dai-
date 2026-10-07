import axios from 'axios';
import { getToken, clearAuthData, isSessionEndedError, isRestrictedError, SESSION_ENDED_EVENT, ACCOUNT_RESTRICTED_EVENT } from './auth';

// Relative base URL by default: requests go to the same origin and the dev-server
// proxy forwards /api to the backend. This keeps the app working unchanged from
// http://localhost:4000 and from a phone on http://192.168.1.107:4000.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// ---------------------------------------------------------------------------
// Shared GETs. The site settings document is read by ~20 components (header,
// footer, chatbot, social bar, modals, the page itself...), which used to mean
// ~10 identical requests on every page load. Calls made within SHARED_TTL_MS
// share one request; each caller gets its own deep copy so a component that
// mutates its copy can't affect the others. Any write clears the cache so
// admin edits are visible immediately.
// ---------------------------------------------------------------------------
const SHARED_GET_URLS = new Set(['/admin/settings']);
const SHARED_TTL_MS = 5000;
const sharedGets = new Map();

const cloneData = (data) => {
  try {
    return typeof structuredClone === 'function' ? structuredClone(data) : JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
};

const rawGet = api.get.bind(api);
api.get = (url, config) => {
  if (!SHARED_GET_URLS.has(url) || (config && Object.keys(config).length > 0)) {
    return rawGet(url, config);
  }
  const now = Date.now();
  let entry = sharedGets.get(url);
  if (!entry || now - entry.at > SHARED_TTL_MS) {
    entry = { at: now, promise: rawGet(url) };
    sharedGets.set(url, entry);
    entry.promise.catch(() => {
      if (sharedGets.get(url) === entry) sharedGets.delete(url);
    });
  }
  return entry.promise.then((res) => ({ ...res, data: cloneData(res.data) }));
};

export const clearSharedGets = () => sharedGets.clear();

// The Facebook URL resolver is a POST but read-only: the same video link is
// resolved by several components on each page load, so memoise per URL for
// the session (the canonical URL of a share link doesn't change).
const FB_RESOLVE_URL = '/admin/facebook/resolve';
const fbResolved = new Map();
const rawPost = api.post.bind(api);
api.post = (url, data, config) => {
  if (url === FB_RESOLVE_URL && data && typeof data.url === 'string' && !config) {
    if (!fbResolved.has(data.url)) {
      const promise = rawPost(url, data);
      promise.catch(() => fbResolved.delete(data.url));
      fbResolved.set(data.url, promise);
    }
    return fbResolved.get(data.url).then((res) => ({ ...res, data: cloneData(res.data) }));
  }
  return rawPost(url, data, config);
};

// Writes that can change shared data (anything under /admin or /superadmin,
// except the read-only resolver) invalidate the shared GET cache. Visitor
// tracking and other public POSTs leave it alone.
const invalidatesShared = (config) => {
  if (!config.method || config.method.toLowerCase() === 'get') return false;
  const url = config.url || '';
  if (url === FB_RESOLVE_URL) return false;
  return url.startsWith('/admin') || url.startsWith('/superadmin');
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (invalidatesShared(config)) {
      clearSharedGets();
    }
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor. A saved login is only dropped when the server says the
// session itself is over (see isSessionEndedError). A failed request, a 5xx or
// a wrong password never signs anyone out. The signed-out state reaches the UI
// through an event, so no hard page reload is needed: the route guards send the
// person home on their own.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A timed suspension: the login is still good, so nothing is cleared - the
    // app is just told to send the visitor back to the home page and explain why.
    if (isRestrictedError(error)) {
      window.dispatchEvent(
        new CustomEvent(ACCOUNT_RESTRICTED_EVENT, {
          detail: { until: error.response?.data?.suspendedUntil || null },
        })
      );
      return Promise.reject(error);
    }
    const sent = error.config?.headers?.Authorization;
    // Only drop the saved login if the request that failed used it. A slow request sent
    // with the previous token (e.g. just before a password change handed out a new one)
    // must not sign out the session that replaced it.
    if (isSessionEndedError(error) && sent && String(sent) === `Bearer ${getToken()}`) {
      clearAuthData();
      delete api.defaults.headers.common.Authorization;
      window.dispatchEvent(
        new CustomEvent(SESSION_ENDED_EVENT, { detail: { code: error.response?.data?.code || null } })
      );
    }
    return Promise.reject(error);
  }
);

export default api;