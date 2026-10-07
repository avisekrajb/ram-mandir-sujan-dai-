const jwt = require('jsonwebtoken');
const User = require('../models/User');
const blockRestricted = require('./restricted');

// Every 401 from this middleware means "this session is over" and carries a
// machine-readable `code`. The web app only signs a person out on these, so a
// 5xx or a network failure (backend restarting, database blip) never costs
// anyone their saved login.
const SESSION_CODES = [
  'NO_TOKEN',
  'TOKEN_INVALID',
  'TOKEN_EXPIRED',
  'USER_NOT_FOUND',
  'ACCOUNT_SUSPENDED',
  'SESSION_REVOKED',
];

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token', code: 'NO_TOKEN' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    const expired = error && error.name === 'TokenExpiredError';
    return res.status(401).json({
      message: expired ? 'Your session has expired. Please sign in again.' : 'Not authorized, invalid token',
      code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    });
  }

  // Purpose-scoped tokens (e.g. password reset) are not session tokens.
  if (decoded.purpose) {
    return res.status(401).json({ message: 'Not authorized, invalid token', code: 'TOKEN_INVALID' });
  }

  try {
    req.user = await User.findById(decoded.id).select('-password');
  } catch (error) {
    // The token is fine; the database is not. Say so with a 503 rather than
    // pretending the login is bad, otherwise a brief outage signs everyone out.
    console.error('Auth middleware error:', error.message);
    return res.status(503).json({
      message: 'Service temporarily unavailable. Please try again.',
      code: 'AUTH_UNAVAILABLE',
    });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found', code: 'USER_NOT_FOUND' });
  }

  // A disabled admin/user is normally locked out entirely (401, so the client drops
  // the session straight away rather than staying "signed in" and failing every
  // request). The exception is a *timed* suspension: that one still signs in, but
  // is held to the home page - see middleware/restricted.js.
  if (req.user.active === false && req.user.role !== 'superadmin') {
    const until = req.user.suspendedUntil;
    if (!(until instanceof Date)) {
      // No end time: the original behaviour, no sign-in until an admin lifts it.
      return res.status(401).json({
        message: 'Account disabled. Contact the super administrator.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }
    if (until.getTime() <= Date.now()) {
      // The window has passed: lift it here so nobody stays locked out by a date
      // that went by while nobody was looking.
      req.user.active = true;
      req.user.suspendedReason = '';
      req.user.suspendedAt = null;
      req.user.suspendedUntil = null;
      req.user
        .save()
        .catch((e) => console.error('Auto-lift of a timed suspension failed:', e.message));
    } else {
      // Still running. The session check below still applies, and then the
      // restricted check refuses anything but the home page.
      req.restrictedUntil = until;
    }
  }

  // Sessions revoked by a password reset / "sign out everywhere".
  if (req.user.tokensValidAfter && decoded.iat * 1000 < req.user.tokensValidAfter.getTime()) {
    return res.status(401).json({
      message: 'Your session has ended. Please sign in again.',
      code: 'SESSION_REVOKED',
    });
  }

  // Lets /auth/me renew a token that is getting old (see getMe).
  req.tokenExp = decoded.exp;

  // Signed in, but suspended for now: allow only the home page's own calls.
  if (req.restrictedUntil) return blockRestricted(req, res, next);

  next();
};

protect.SESSION_CODES = SESSION_CODES;

module.exports = protect;
