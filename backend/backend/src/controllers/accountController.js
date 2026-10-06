/**
 * Account management for the admin panel.
 *
 * Who may do what
 *  - superadmin: everything, to everyone except other superadmins (a super
 *    administrator is never edited, suspended, demoted or deleted from here).
 *  - admin: manage ordinary users (edit, suspend, reset password, sign out,
 *    delete). Admins are read-only to other admins.
 * Nobody can suspend, delete or demote themselves from this API; own account
 * changes go through /api/admin/profile.
 *
 * Every state change is written to the audit log (AdminLog).
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Donation = require('../models/Donation');
const AdminLog = require('../models/AdminLog');
const { AREAS, hasArea } = require('../middleware/permissions');
const { logAdminActivity } = require('./adminController');
const { passwordProblem } = require('../utils/passwordPolicy');

const isSuper = (u) => u && u.role === 'superadmin';
const sameId = (a, b) => String(a) === String(b);
const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------- helpers ----

/** Fields every admin may see about an account (never secrets). */
const toAccount = (u, viewer, extra = {}) => {
  const o = typeof u.toObject === 'function' ? u.toObject() : u;
  const out = {
    _id: o._id,
    name: o.name || '',
    email: o.email,
    phone: o.phone || '',
    address: o.address || '',
    profilePhoto: o.profilePhoto || null,
    role: o.role,
    active: o.active !== false,
    isGoogleUser: !!o.isGoogleUser,
    suspendedReason: o.suspendedReason || '',
    suspendedAt: o.suspendedAt || null,
    lastLoginAt: o.lastLoginAt || null,
    loginCount: o.loginCount || 0,
    mustChangePassword: !!o.mustChangePassword,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    ...extra,
  };
  if (o.role === 'admin') {
    // null = unrestricted; an array = limited to those areas.
    out.permissions = Array.isArray(o.permissions) ? o.permissions : null;
  }
  // IP addresses are personal data: only the super admin sees them.
  if (isSuper(viewer)) out.lastLoginIp = o.lastLoginIp || '';
  return out;
};

/** Random, readable temporary password: three groups of four, e.g. "kT7m-Qp3x-Vn8d". */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const generateTempPassword = () => {
  for (;;) {
    const raw = Array.from({ length: 12 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
    if (/[a-z]/.test(raw) && /[A-Z]/.test(raw) && /\d/.test(raw)) {
      return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
    }
  }
};

const fail = (res, status, message, code) => res.status(status).json({ success: false, message, ...(code ? { code } : {}) });

/** Load a target and apply the "may this actor manage it" rules. Returns the doc or sends a response. */
const loadManageable = async (req, res, { allowSelf = false } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    fail(res, 404, 'Account not found');
    return null;
  }
  const target = await User.findById(req.params.id);
  if (!target) {
    fail(res, 404, 'Account not found');
    return null;
  }
  if (!allowSelf && sameId(target._id, req.user._id)) {
    fail(res, 400, 'You cannot do this to your own account here. Use "My account" instead.', 'SELF');
    return null;
  }
  if (isSuper(target)) {
    fail(res, 403, 'A super administrator account cannot be changed from here.', 'TARGET_SUPERADMIN');
    return null;
  }
  if (target.role === 'admin' && !isSuper(req.user)) {
    fail(res, 403, 'Only the super administrator can manage admin accounts.', 'ADMIN_TARGET');
    return null;
  }
  return target;
};

const audit = (req, action, target, extra = {}) =>
  logAdminActivity(req.user.id, action, {
    targetId: String(target._id),
    targetName: target.name || '',
    targetEmail: target.email || '',
    ...extra,
  });

const cleanPermissions = (value) => {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return undefined;
  return [...new Set(value.filter((a) => AREAS.includes(a)))];
};

// One rule for every role (8+ characters, no common/sequential passwords): see utils/passwordPolicy.js.
const validateNewPassword = (password) => passwordProblem(password);

// ------------------------------------------------------------------- list ----

// GET /api/admin/accounts
exports.listAccounts = async (req, res) => {
  try {
    const { q = '', role = '', status = '', provider = '', joined = '', sort = 'newest' } = req.query;
    const all = req.query.limit === 'all';
    const limit = all ? 5000 : Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const page = all ? 1 : Math.max(parseInt(req.query.page, 10) || 1, 1);

    const filter = {};
    const search = String(q).replace(/\0/g, '').trim().slice(0, 80);
    if (search) {
      const rx = new RegExp(escapeRx(search), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }
    if (role === 'staff') filter.role = { $in: ['admin', 'superadmin'] };
    else if (['user', 'admin', 'superadmin'].includes(role)) filter.role = role;
    if (status === 'active') filter.active = { $ne: false };
    else if (status === 'suspended') filter.active = false;
    if (provider === 'google') filter.isGoogleUser = true;
    else if (provider === 'password') filter.isGoogleUser = { $ne: true };
    if (['7', '30'].includes(String(joined))) {
      filter.createdAt = { $gte: new Date(Date.now() - Number(joined) * 86400000) };
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name: { name: 1 },
      lastLogin: { lastLoginAt: -1, createdAt: -1 },
    };

    const [total, rows] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort(Object.prototype.hasOwnProperty.call(sortMap, sort) ? sortMap[sort] : sortMap.newest)
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    // Booking / donation counts for just this page, only for admins who can open those areas.
    const canBookings = hasArea(req.user, 'bookings');
    const canDonations = hasArea(req.user, 'donations');
    const ids = rows.map((u) => u._id);
    const [bookingAgg, donationAgg] = ids.length
      ? await Promise.all([
          canBookings ? Booking.aggregate([{ $match: { userId: { $in: ids } } }, { $group: { _id: '$userId', count: { $sum: 1 } } }]) : [],
          canDonations ? Donation.aggregate([
            { $match: { userId: { $in: ids } } },
            {
              $group: {
                _id: '$userId',
                count: { $sum: 1 },
                total: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
              },
            },
          ]) : [],
        ])
      : [[], []];
    const bookingBy = new Map(bookingAgg.map((b) => [String(b._id), b.count]));
    const donationBy = new Map(donationAgg.map((d) => [String(d._id), d]));

    const data = rows.map((u) =>
      toAccount(u, req.user, {
        ...(canBookings ? { bookingCount: bookingBy.get(String(u._id)) || 0 } : {}),
        ...(canDonations
          ? {
              donationCount: donationBy.get(String(u._id))?.count || 0,
              donationTotal: donationBy.get(String(u._id))?.total || 0,
            }
          : {}),
      })
    );

    res.json({ success: true, data, total, page, pages: Math.max(Math.ceil(total / limit), 1), limit });
  } catch (error) {
    console.error('List accounts error:', error);
    fail(res, 500, 'Server error');
  }
};

// GET /api/admin/accounts/summary
exports.accountSummary = async (req, res) => {
  try {
    const now = Date.now();
    const d7 = new Date(now - 7 * 86400000);
    const d30 = new Date(now - 30 * 86400000);

    const [roles, suspended, google, neverSignedIn, new7, new30, perDay] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.countDocuments({ active: false }),
      User.countDocuments({ isGoogleUser: true }),
      User.countDocuments({ lastLoginAt: null }),
      User.countDocuments({ createdAt: { $gte: d7 } }),
      User.countDocuments({ createdAt: { $gte: d30 } }),
      User.aggregate([
        { $match: { createdAt: { $gte: d30 } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kathmandu' } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const byRole = { user: 0, admin: 0, superadmin: 0 };
    roles.forEach((r) => {
      if (r._id in byRole) byRole[r._id] = r.count;
    });
    const total = byRole.user + byRole.admin + byRole.superadmin;

    // Dense 30-day series so the chart has no gaps.
    const map = new Map(perDay.map((d) => [d._id, d.count]));
    const signupsByDay = [];
    for (let i = 29; i >= 0; i--) {
      const key = new Date(now - i * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' });
      signupsByDay.push({ date: key, count: map.get(key) || 0 });
    }

    res.json({
      success: true,
      data: { total, byRole, suspended, active: total - suspended, google, neverSignedIn, new7, new30, signupsByDay },
    });
  } catch (error) {
    console.error('Account summary error:', error);
    fail(res, 500, 'Server error');
  }
};

// GET /api/admin/accounts/:id
exports.getAccount = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return fail(res, 404, 'Account not found');
    const user = await User.findById(req.params.id);
    if (!user) return fail(res, 404, 'Account not found');

    const canBookings = hasArea(req.user, 'bookings');
    const canDonations = hasArea(req.user, 'donations');
    const [bookings, donations, bookingCount, donationAgg, activity] = await Promise.all([
      canBookings ? Booking.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).select('type date status createdAt').lean() : [],
      canDonations ? Donation.find({ userId: user._id }).sort({ date: -1 }).limit(5).select('amount status paymentMethod date').lean() : [],
      canBookings ? Booking.countDocuments({ userId: user._id }) : 0,
      canDonations ? Donation.aggregate([
        { $match: { userId: user._id } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
          },
        },
      ]) : [],
      // What this person did (if staff) and what was done to them.
      AdminLog.find({ $or: [{ adminId: user._id }, { 'details.targetId': String(user._id) }] })
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
    ]);

    res.json({
      success: true,
      data: toAccount(user, req.user, {
        ...(canBookings ? { bookingCount, recentBookings: bookings } : {}),
        ...(canDonations
          ? { donationCount: donationAgg[0]?.count || 0, donationTotal: donationAgg[0]?.total || 0, recentDonations: donations }
          : {}),
        activity: activity.map((a) => ({
          _id: a._id,
          action: a.action,
          at: a.createdAt,
          by: a.user?.name || 'Admin',
          byId: a.adminId,
          done: sameId(a.adminId, user._id) ? 'by' : 'to',
          details: a.details || {},
        })),
      }),
    });
  } catch (error) {
    console.error('Get account error:', error);
    fail(res, 500, 'Server error');
  }
};

// ----------------------------------------------------------------- create ----

// POST /api/admin/accounts
exports.createAccount = async (req, res) => {
  try {
    const body = req.body || {};
    const role = body.role === 'admin' ? 'admin' : 'user';
    if (role === 'admin' && !isSuper(req.user)) {
      return fail(res, 403, 'Only the super administrator can create admin accounts.', 'ADMIN_TARGET');
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').toLowerCase().trim();
    if (name.length < 2 || name.length > 50) return fail(res, 400, 'Name must be 2 to 50 characters');
    if (!validator.isEmail(email)) return fail(res, 400, 'Enter a valid email address');
    if (await User.exists({ email })) return fail(res, 400, 'An account with this email already exists');

    // Either the admin types a password, or one is generated and shown once.
    let password = body.password;
    let temporaryPassword = null;
    if (!password || body.generatePassword) {
      password = generateTempPassword();
      temporaryPassword = password;
    } else {
      const problem = validateNewPassword(password, role);
      if (problem) return fail(res, 400, problem);
    }

    const permissions = role === 'admin' ? cleanPermissions(body.permissions) : undefined;
    if (role === 'admin' && (!('permissions' in body) || permissions === undefined)) {
      return fail(res, 400, 'Choose what this admin can use: send permissions as a list of areas, or null for full access');
    }

    const user = new User({
      name,
      email,
      password,
      phone: String(body.phone || '').trim().slice(0, 30),
      address: String(body.address || '').trim().slice(0, 200),
      role,
      active: true,
      createdBy: req.user._id,
      // Admin accounts handed a password by a super admin must pick their own.
      mustChangePassword: role === 'admin' && body.mustChangePassword !== false,
    });
    if (role === 'admin' && Array.isArray(permissions)) user.permissions = permissions;
    user.$locals.keepMustChangePassword = true;
    await user.save();

    audit(req, role === 'admin' ? 'Admin Created' : 'Account Created', user, {
      role,
      ...(role === 'admin' ? { access: Array.isArray(permissions) ? permissions : 'full' } : {}),
    });

    res.status(201).json({ success: true, data: toAccount(user, req.user), temporaryPassword });
  } catch (error) {
    console.error('Create account error:', error);
    // The User post-save hook turns a unique-index clash into "Duplicate email...".
    if (/^Duplicate /.test(error.message || '')) return fail(res, 400, 'An account with this email already exists');
    fail(res, 500, error.name === 'ValidationError' ? error.message : 'Server error');
  }
};

// ------------------------------------------------------------------- edit ----

// PATCH /api/admin/accounts/:id
exports.updateAccount = async (req, res) => {
  try {
    const target = await loadManageable(req, res, { allowSelf: false });
    if (!target) return;
    const body = req.body || {};
    const changed = [];

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2 || name.length > 50) return fail(res, 400, 'Name must be 2 to 50 characters');
      if (name !== target.name) changed.push('name');
      target.name = name;
    }
    if (body.phone !== undefined) {
      const phone = String(body.phone).trim().slice(0, 30);
      if (phone !== target.phone) changed.push('phone');
      target.phone = phone;
    }
    if (body.address !== undefined) {
      const address = String(body.address).trim().slice(0, 200);
      if (address !== target.address) changed.push('address');
      target.address = address;
    }
    if (body.email !== undefined) {
      const email = String(body.email).toLowerCase().trim();
      if (email !== target.email) {
        // The email is the sign-in identity, so only the super administrator may change it.
        if (!isSuper(req.user)) return fail(res, 403, 'Only the super administrator can change an email address.');
        if (!validator.isEmail(email)) return fail(res, 400, 'Enter a valid email address');
        if (await User.exists({ email, _id: { $ne: target._id } })) return fail(res, 400, 'Another account already uses this email');
        if (target.isGoogleUser) return fail(res, 400, 'This account signs in with Google; its email cannot be changed.');
        target.email = email;
        changed.push('email');
      }
    }

    if (!changed.length) return res.json({ success: true, data: toAccount(target, req.user), unchanged: true });
    await target.save();
    audit(req, 'Account Updated', target, { fields: changed });
    res.json({ success: true, data: toAccount(target, req.user) });
  } catch (error) {
    console.error('Update account error:', error);
    fail(res, 500, error.name === 'ValidationError' ? error.message : 'Server error');
  }
};

// PUT /api/admin/accounts/:id/status   { active, reason? }
exports.setStatus = async (req, res) => {
  try {
    if (typeof req.body?.active !== 'boolean') return fail(res, 400, 'active must be true or false');
    const target = await loadManageable(req, res);
    if (!target) return;
    const active = req.body.active;

    target.active = active;
    if (active) {
      target.suspendedReason = '';
      target.suspendedAt = null;
    } else {
      target.suspendedReason = String(req.body.reason || '').trim().slice(0, 300);
      target.suspendedAt = new Date();
      target.revokeSessions(true); // takes effect immediately, not at next token expiry
    }
    await target.save();
    audit(req, active ? 'Account Reactivated' : 'Account Suspended', target, active ? {} : { reason: target.suspendedReason });
    res.json({ success: true, data: toAccount(target, req.user) });
  } catch (error) {
    console.error('Set status error:', error);
    fail(res, 500, 'Server error');
  }
};

// PUT /api/admin/accounts/:id/role   { role: 'user' | 'admin', permissions? }   (super admin only)
exports.setRole = async (req, res) => {
  try {
    if (!isSuper(req.user)) return fail(res, 403, 'Only the super administrator can change roles.', 'ADMIN_TARGET');
    const { role } = req.body || {};
    if (!['user', 'admin'].includes(role)) return fail(res, 400, 'Role must be "user" or "admin"');
    const target = await loadManageable(req, res);
    if (!target) return;
    if (target.role === role) return res.json({ success: true, data: toAccount(target, req.user), unchanged: true });

    const permissions = role === 'admin' ? cleanPermissions(req.body.permissions) : undefined;
    if (role === 'admin' && (!('permissions' in req.body) || permissions === undefined)) {
      return fail(res, 400, 'Choose what this admin can use: send permissions as a list of areas, or null for full access');
    }
    const before = target.role;
    target.role = role;
    if (role === 'admin') {
      target.permissions = Array.isArray(permissions) ? permissions : undefined;
    } else {
      target.permissions = undefined; // permissions are meaningless for a normal user
    }
    // Losing or gaining staff access should not ride on old sessions.
    target.revokeSessions(true);
    await target.save();
    audit(req, role === 'admin' ? 'Admin Access Granted' : 'Admin Access Removed', target, { from: before, to: role });
    res.json({ success: true, data: toAccount(target, req.user) });
  } catch (error) {
    console.error('Set role error:', error);
    fail(res, 500, 'Server error');
  }
};

// PUT /api/admin/accounts/:id/permissions   { permissions: string[] | null }   (super admin only)
exports.setPermissions = async (req, res) => {
  try {
    if (!isSuper(req.user)) return fail(res, 403, 'Only the super administrator can change access areas.', 'ADMIN_TARGET');
    const target = await loadManageable(req, res);
    if (!target) return;
    if (target.role !== 'admin') return fail(res, 400, 'Access areas apply to admin accounts only.');
    const permissions = cleanPermissions(req.body?.permissions);
    if (!req.body || !('permissions' in req.body) || permissions === undefined) {
      return fail(res, 400, 'permissions must be a list of areas, or null for full access');
    }

    target.permissions = Array.isArray(permissions) ? permissions : undefined;
    target.markModified('permissions');
    await target.save();
    audit(req, 'Admin Access Updated', target, { access: Array.isArray(permissions) ? permissions : 'full' });
    res.json({ success: true, data: toAccount(target, req.user) });
  } catch (error) {
    console.error('Set permissions error:', error);
    fail(res, 500, 'Server error');
  }
};

// ----------------------------------------------------- passwords & sessions ----

// POST /api/admin/accounts/:id/reset-password   -> { temporaryPassword }
exports.resetPassword = async (req, res) => {
  try {
    const target = await loadManageable(req, res);
    if (!target) return;
    const temporaryPassword = generateTempPassword();
    target.password = temporaryPassword;
    target.resetPasswordToken = undefined;
    target.resetPasswordExpire = undefined;
    target.resetOtpAttempts = 0;
    // Staff must replace a password someone else knows; ordinary users are not
    // forced (the public site has no such prompt) but their old sessions end.
    target.mustChangePassword = target.role === 'admin';
    target.$locals.keepMustChangePassword = true;
    target.revokeSessions(true);
    await target.save();

    audit(req, 'Password Reset', target, { forcedChange: target.mustChangePassword });
    res.json({ success: true, data: toAccount(target, req.user), temporaryPassword });
  } catch (error) {
    console.error('Reset password error:', error);
    fail(res, 500, 'Server error');
  }
};

// POST /api/admin/accounts/:id/revoke-sessions
exports.revokeSessions = async (req, res) => {
  try {
    const target = await loadManageable(req, res);
    if (!target) return;
    target.revokeSessions(true);
    await target.save();
    audit(req, 'Sessions Revoked', target);
    res.json({ success: true, message: 'Signed out of every device', data: toAccount(target, req.user) });
  } catch (error) {
    console.error('Revoke sessions error:', error);
    fail(res, 500, 'Server error');
  }
};

// ----------------------------------------------------------------- delete ----

// DELETE /api/admin/accounts/:id
exports.deleteAccount = async (req, res) => {
  try {
    const target = await loadManageable(req, res);
    if (!target) return;
    const [bookings, donations] = await Promise.all([
      Booking.countDocuments({ userId: target._id }),
      Donation.countDocuments({ userId: target._id }),
    ]);
    await target.deleteOne();
    audit(req, 'Account Deleted', target, { role: target.role, bookings, donations });
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    fail(res, 500, 'Server error');
  }
};

// POST /api/admin/accounts/bulk   { ids: [], action: 'suspend' | 'activate' | 'delete', reason? }
// Ordinary users only; anything else in the selection is skipped and reported.
exports.bulkAction = async (req, res) => {
  try {
    const { ids, action } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) return fail(res, 400, 'Select at least one account');
    if (ids.length > 200) return fail(res, 400, 'Select at most 200 accounts at a time');
    if (!['suspend', 'activate', 'delete'].includes(action)) return fail(res, 400, 'Unknown action');

    const valid = ids.filter((id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && !sameId(id, req.user._id));
    const targets = await User.find({ _id: { $in: valid }, role: 'user' }).select('_id name email');
    const targetIds = targets.map((t) => t._id);
    const skipped = ids.length - targetIds.length;

    if (targetIds.length) {
      if (action === 'delete') {
        await User.deleteMany({ _id: { $in: targetIds } });
      } else if (action === 'activate') {
        await User.updateMany({ _id: { $in: targetIds } }, { $set: { active: true, suspendedReason: '', suspendedAt: null } });
      } else {
        const now = new Date();
        await User.updateMany(
          { _id: { $in: targetIds } },
          {
            $set: {
              active: false,
              suspendedReason: String(req.body.reason || '').trim().slice(0, 300),
              suspendedAt: now,
              tokensValidAfter: new Date(Math.ceil(now.getTime() / 1000) * 1000),
            },
          }
        );
      }
      logAdminActivity(req.user.id, `Bulk ${action === 'delete' ? 'Delete' : action === 'suspend' ? 'Suspend' : 'Reactivate'}`, {
        count: targetIds.length,
        sample: targets.slice(0, 5).map((t) => t.email),
      });
    }

    res.json({ success: true, affected: targetIds.length, skipped });
  } catch (error) {
    console.error('Bulk action error:', error);
    fail(res, 500, 'Server error');
  }
};

exports._internals = { generateTempPassword, toAccount };
