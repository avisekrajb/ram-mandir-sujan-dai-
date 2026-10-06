// "Sign in with an email code": the way in when Google (or a forgotten password) is
// in the way. The person gives an email address, gets a 6-digit code by mail and
// enters it; a visitor with no account yet gets one created, the same as signing in
// with Google does.
//
// Rules worth knowing:
//  - Only ordinary visitor accounts (role `user`) can use a code. Temple staff accounts
//    keep to their password; for them (and suspended accounts) the request still
//    answers "sent", at the same speed, and nothing is mailed, so the form does not
//    reveal who is staff.
//  - A code is 6 digits, lasts 10 minutes, is used once, and allows 5 guesses in all
//    (counted before the guess is checked, so parallel guesses cannot sneak past).
//    One MAILBOX can be sent a new code once a minute and 5 an hour, and the whole
//    server at most GLOBAL_MAX_SENDS_PER_HOUR an hour, so this cannot be used to
//    mail-bomb someone or use up the mail account's daily quota.
//  - Only a keyed hash of the code is stored (models/LoginCode.js), and a record is
//    never deleted by a guess, so the limits cannot be reset by guessing wrong.

const crypto = require('crypto');
const validator = require('validator');
const User = require('../models/User');
const LoginCode = require('../models/LoginCode');
const { createNotification } = require('./notificationController');
const { sendWelcomeEmail, sendEmail, isEmailConfigured } = require('../services/emailService');
const { sendLoginCodeEmail } = require('../services/loginCodeEmail');
const { generateToken, recordLogin } = require('./authController');

const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 5;
const GLOBAL_MAX_SENDS_PER_HOUR = 60;
const HOUR_MS = 60 * 60 * 1000;

const randomHash = () => crypto.randomBytes(32).toString('hex');

const hashCode = (email, code) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET).update(`login-code:${email}:${code}`).digest('hex');

// Plain, unquoted addresses only. validator.isEmail also accepts quoted names
// ("a b"@example.com) which a mail library reads differently from the string we keyed
// the limits on, so those are refused here.
const SAFE_EMAIL = /^[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

const cleanEmail = (value) => {
  if (typeof value !== 'string') return null;
  const email = value.toLowerCase().trim();
  return email.length <= 200 && SAFE_EMAIL.test(email) && validator.isEmail(email) ? email : null;
};

// The mailbox an address delivers to, as far as we can tell: the +tag does not matter
// to nearly every provider, and Gmail ignores dots as well. Used for the limits so that
// v+1@gmail.com, v+2@gmail.com and v.i.c@gmail.com cannot each have their own.
const mailboxKey = (email) => {
  let [local, domain] = email.split('@');
  local = local.split('+')[0];
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '');
    domain = 'gmail.com';
  }
  return `${local}@${domain}`;
};

const isSuperAdminEmail = (email) =>
  email === String(process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();

// "john.doe+temple@example.com" -> "John Doe"
const nameFromEmail = (email) => {
  const words = email
    .split('@')[0]
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  const name = words.join(' ').slice(0, 50);
  return name.length >= 2 ? name : 'Devotee';
};

// Rolling count of code requests served in the last hour, across every address.
const recentSends = [];
const globalSlot = (now) => {
  while (recentSends.length && recentSends[0] <= now - HOUR_MS) recentSends.shift();
  return recentSends.length < GLOBAL_MAX_SENDS_PER_HOUR
    ? { free: true }
    : { free: false, retryAfter: Math.max(1, Math.ceil((recentSends[0] + HOUR_MS - now) / 1000)) };
};

/**
 * Take the right to send this mailbox a code, in single atomic steps so that parallel
 * requests cannot all pass the checks: the update only matches while the cooldown is
 * over and the hourly count is below the cap, and it moves the cooldown forward as it
 * matches. Resolves { ok: true } or { cooldown/rateLimited: true, retryAfter }.
 */
const claimSendSlot = async (key, fields, now) => {
  const cooldownOver = new Date(now - RESEND_SECONDS * 1000);
  const windowOver = new Date(now - HOUR_MS);

  // Still inside the hour: one more send, if the cap allows.
  let done = await LoginCode.findOneAndUpdate(
    { key, sentAt: { $lte: cooldownOver }, windowStart: { $gt: windowOver }, sends: { $lt: MAX_SENDS_PER_HOUR } },
    { $set: fields, $inc: { sends: 1 } }
  );
  // The hour is over: start counting again.
  if (!done) {
    done = await LoginCode.findOneAndUpdate(
      { key, sentAt: { $lte: cooldownOver }, windowStart: { $lte: windowOver } },
      { $set: { ...fields, windowStart: new Date(now), sends: 1 } }
    );
  }
  if (done) return { ok: true };

  const existing = await LoginCode.findOne({ key });
  if (!existing) {
    try {
      await LoginCode.create({ key, ...fields, windowStart: new Date(now), sends: 1 });
      return { ok: true };
    } catch (error) {
      if (error && error.code === 11000) return { cooldown: true, retryAfter: RESEND_SECONDS }; // a parallel request got there first
      throw error;
    }
  }
  const wait = Math.ceil((existing.sentAt.getTime() + RESEND_SECONDS * 1000 - now) / 1000);
  if (wait > 0) return { cooldown: true, retryAfter: wait };
  return { rateLimited: true, retryAfter: Math.max(1, Math.ceil((existing.windowStart.getTime() + HOUR_MS - now) / 1000)) };
};

// @desc    Email a sign-in code
// @route   POST /api/auth/login-code/request
// @access  Public
exports.requestLoginCode = async (req, res) => {
  try {
    const email = cleanEmail(req.body && req.body.email);
    if (!email) {
      return res.status(400).json({ success: false, code: 'invalid_email', message: 'Enter a valid email address.' });
    }
    if (!isEmailConfigured()) {
      return res.status(503).json({ success: false, code: 'send_failed', message: 'Email sign-in is not available right now.' });
    }

    const now = Date.now();
    const slot = globalSlot(now);
    if (!slot.free) {
      return res.status(429).json({ success: false, code: 'rate_limited', retryAfter: slot.retryAfter, message: 'Too many codes were requested. Please try again later.' });
    }

    const key = mailboxKey(email);
    const user = await User.findOne({ email }).select('role active');
    const eligible = !isSuperAdminEmail(email) && (!user || (user.role === 'user' && user.active !== false));

    // A record is kept either way, so the cooldown and the hourly cap behave the same
    // for every address; one that cannot sign in with a code gets a hash nothing matches.
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const sentAt = new Date(now);
    const claim = await claimSendSlot(
      key,
      {
        email,
        codeHash: eligible ? hashCode(email, code) : randomHash(),
        expiresAt: new Date(now + CODE_MINUTES * 60 * 1000),
        attempts: 0,
        sentAt,
      },
      now
    );
    if (claim.cooldown) {
      return res.status(429).json({ success: false, code: 'cooldown', retryAfter: claim.retryAfter, message: 'Please wait a moment before asking for another code.' });
    }
    if (claim.rateLimited) {
      return res.status(429).json({ success: false, code: 'rate_limited', retryAfter: claim.retryAfter, message: 'Too many codes were requested for this address. Please try again later.' });
    }
    recentSends.push(now);

    // Answer at once, whoever it was for: waiting for the mail server only for the
    // addresses that really get a mail would tell staff accounts apart by speed. If the
    // mail does not go out, the slot is given back so the person can ask again.
    if (eligible) {
      const giveBack = (why) => {
        console.error('Login code email failed:', why);
        return LoginCode.updateOne(
          { key, sentAt },
          { $set: { sentAt: new Date(0), expiresAt: new Date(0) }, $inc: { sends: -1 } }
        ).catch(() => {});
      };
      sendLoginCodeEmail({ email, code, lang: req.body.lang, minutes: CODE_MINUTES })
        .then((result) => {
          if (!result || result.error || result.messageId === 'skipped') return giveBack((result && result.error) || 'not sent');
          return undefined;
        })
        .catch((error) => giveBack(error && error.message));
    }

    res.json({
      success: true,
      retryAfter: RESEND_SECONDS,
      expiresInMinutes: CODE_MINUTES,
      message: 'If this address can sign in with a code, one has been sent.',
    });
  } catch (error) {
    console.error('Request login code error:', error);
    res.status(500).json({ success: false, code: 'send_failed', message: 'Server error. Please try again.' });
  }
};

// @desc    Check an emailed code and sign in
// @route   POST /api/auth/login-code/verify
// @access  Public
exports.verifyLoginCode = async (req, res) => {
  const wrong = () => res.status(400).json({ success: false, code: 'code_invalid', message: 'That code is wrong or has expired.' });
  let claimed = null; // the record as it was before the code was used, to put back if signing in fails
  try {
    const email = cleanEmail(req.body && req.body.email);
    const code = typeof (req.body && req.body.code) === 'string' ? req.body.code.replace(/\s+/g, '') : '';
    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, code: 'code_invalid', message: 'Enter the 6-digit code.' });
    }
    const key = mailboxKey(email);

    // Every guess is counted first, in one atomic step that only matches while guesses
    // are left: however many are sent at once, no more than MAX_ATTEMPTS get checked.
    const pending = await LoginCode.findOneAndUpdate(
      { key, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } },
      { $inc: { attempts: 1 } },
      { new: true }
    );
    if (!pending) return wrong();

    const expected = Buffer.from(pending.codeHash, 'hex');
    const given = Buffer.from(hashCode(email, code), 'hex');
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return wrong();

    // Use the code up in one step so two requests can never both sign in with it. The
    // record stays (with its send counters); it just stops matching anything.
    claimed = await LoginCode.findOneAndUpdate(
      { _id: pending._id, codeHash: pending.codeHash, expiresAt: { $gt: new Date() } },
      { $set: { codeHash: randomHash(), expiresAt: new Date(0) } }
    );
    if (!claimed) return wrong();

    let user = await User.findOne({ email });
    if (isSuperAdminEmail(email) || (user && (user.role !== 'user' || user.active === false))) {
      return wrong();
    }

    let isNewAccount = false;
    if (!user) {
      try {
        user = await User.create({
          name: nameFromEmail(email),
          email,
          // Nobody knows this: the account is entered with codes (or Google) unless the
          // person later chooses a password through "Forgot password".
          password: crypto.randomBytes(24).toString('hex'),
          phone: '',
          address: '',
          role: 'user',
          emailVerified: true,
        });
        isNewAccount = true;
      } catch (createError) {
        // A parallel request created it first.
        user = await User.findOne({ email });
        if (!user) throw createError;
      }

      if (isNewAccount) {
        try {
          await createNotification(
            'user',
            'New Devotee Registered (email code)',
            `${user.name} joined the temple community with an email code`,
            { id: user._id, name: user.name, email: user.email, phone: '', role: user.role, createdAt: user.createdAt }
          );
        } catch (notifyError) {
          console.error('Login code notification error:', notifyError.message);
        }
        try {
          await sendWelcomeEmail(user);
        } catch (emailError) {
          console.error('Login code welcome email error:', emailError.message);
        }
      }
    }

    // The code just proved this person controls the address. If the account was opened earlier with a
    // password nobody ever verified, that password may belong to someone else (they registered with
    // an address that is not theirs), so it is replaced by an unknown one and its sessions end.
    if (!isNewAccount && !user.emailVerified) {
      user.password = crypto.randomBytes(24).toString('hex');
      user.revokeSessions(); // not "strict": the token issued below, in this same request, must survive
      user.emailVerified = true;
      await user.save();
      // Never silent: tell the owner of the address what happened and how to get a password back.
      sendEmail({
        to: user.email,
        subject: 'Your password was removed - Shree Ramchandra Temple',
        html: `<p>Namaste,</p><p>You just signed in with an e-mailed code, which proves this address is yours. For your security the old password of this account was removed and other devices were signed out.</p><p>You can keep signing in with an e-mailed code or Google, or choose a new password with "Forgot password".</p><p>If this was not you, please contact the temple office.</p>`,
      }).catch(() => {});
    }

    const token = generateToken(user._id);
    await recordLogin(user, req);
    user.password = undefined;

    res.json({ success: true, token, user, isNewAccount });
  } catch (error) {
    console.error('Verify login code error:', error);
    // The code was right but signing in failed on our side: give it back so the person
    // can try again rather than having to ask for a new one.
    if (claimed) {
      await LoginCode.updateOne(
        { _id: claimed._id },
        { $set: { codeHash: claimed.codeHash, expiresAt: claimed.expiresAt } }
      ).catch(() => {});
    }
    res.status(500).json({ success: false, code: 'server_error', message: 'Server error. Please try again.' });
  }
};
