const AdminSettings = require('../models/AdminSettings');
const BankAccount = require('../models/BankAccount');
const AdminLog = require('../models/AdminLog');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');

// ============================================
// DONATION CONFIG (feature switches + account numbers + QR)
// ============================================
//
// The super admin can independently switch off eSewa, Khalti and IPS, and can
// also hide the QR image or the bank account numbers. The donate page reads
// this one public endpoint and renders accordingly: when every gateway is off it
// falls back to an account-number-only layout.

const logDonationActivity = (adminId, action, details = {}) => {
  User.findById(adminId)
    .select('name email')
    .lean()
    .then((u) =>
      AdminLog.create({
        adminId,
        action,
        details,
        user: { id: adminId, name: u?.name || 'Admin', email: u?.email || '' },
      })
    )
    .catch((e) => console.error('AdminLog persist error:', e.message));
};

// Default to "on" for every switch so a settings document written before these
// fields existed keeps behaving exactly as before.
const normalizeFeatures = (donate = {}) => ({
  esewaEnabled: donate.esewaEnabled !== false,
  khaltiEnabled: donate.khaltiEnabled !== false,
  ipsEnabled: donate.ipsEnabled !== false,
  qrEnabled: donate.qrEnabled !== false,
  showBankDetails: donate.showBankDetails !== false,
});

// Only these keys may be written through the toggle endpoint.
const FEATURE_KEYS = Object.keys(normalizeFeatures());

/**
 * Build the public donation config.
 * The legacy single `bankNumber` / `bankName` / `accountHolder` trio on
 * `settings.donate` is still honoured so existing installations keep showing
 * something before the first BankAccount record is created.
 */
const buildDonationConfig = async () => {
  const settings = await AdminSettings.getSettings();
  const donate = settings.donate || {};
  const features = normalizeFeatures(donate);

  const accounts = await BankAccount.find({ active: { $ne: false } })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const legacyAccount =
    !accounts.length && String(donate.bankNumber || '').trim()
      ? [
          {
            _id: 'legacy',
            title: donate.bankName || '',
            bankName: donate.bankName || '',
            accountHolder: donate.accountHolder || '',
            accountNumber: donate.bankNumber || '',
            accountType: 'current',
            branch: '',
            note: '',
            qrPhoto: null,
          },
        ]
      : [];

  const publicAccounts = [...legacyAccount, ...accounts];
  const gatewayCount = [
    features.esewaEnabled,
    features.khaltiEnabled,
    features.ipsEnabled,
  ].filter(Boolean).length;

  // `instruction` is the display field; older records only stored `note`.
  const withInstruction = publicAccounts.map((a) => ({
    ...a,
    instruction: a.instruction || a.note || '',
  }));

  // With the account numbers switched off the numbers must not leave the server
  // at all — the UI hiding them is not enough, since /donations/config is public.
  const exposedAccounts = features.showBankDetails ? withInstruction : [];

  return {
    features,
    // True when no online gateway is available, so the page should present the
    // account numbers (and QR, if enabled) as the only way to donate.
    accountOnly: gatewayCount === 0,
    hasAccounts: exposedAccounts.length > 0,
    accountsHidden: !features.showBankDetails,
    qrPhoto: features.qrEnabled ? donate.qrPhoto || null : null,
    baseCount: donate.baseCount || 0,
    accounts: exposedAccounts,
  };
};

// @desc    Public donation config (feature switches, accounts, QR)
// @route   GET /api/donations/config
// @access  Public
exports.getDonationConfig = async (req, res) => {
  try {
    res.json({ success: true, data: await buildDonationConfig() });
  } catch (error) {
    console.error('Get donation config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get donation features + accounts (super admin)
// @route   GET /api/superadmin/donation-config
// @access  Private/SuperAdmin
exports.getDonationConfigAdmin = async (req, res) => {
  try {
    const config = await buildDonationConfig();
    const settings = await AdminSettings.getSettings();
    const donate = settings.donate || {};
    res.json({
      success: true,
      data: {
        ...config,
        // Unfiltered list so the admin can see (and re-enable) inactive accounts.
        allAccounts: await BankAccount.find().sort({ order: 1, createdAt: 1 }).lean(),
        qrPhotoRaw: donate.qrPhoto || null,
        baseCount: donate.baseCount || 0,
      },
    });
  } catch (error) {
    console.error('Get donation config (admin) error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Toggle eSewa / Khalti / IPS / QR / bank details (super admin)
// @route   PUT /api/superadmin/donation-features
// @access  Private/SuperAdmin
exports.updateDonationFeatures = async (req, res) => {
  try {
    const settings = await AdminSettings.getSettings();
    if (!settings.donate) settings.donate = {};

    const current = normalizeFeatures(settings.donate);
    const next = { ...current };

    FEATURE_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        next[key] = req.body[key] !== false;
      }
    });

    FEATURE_KEYS.forEach((key) => {
      settings.donate[key] = next[key];
    });

    if (Object.prototype.hasOwnProperty.call(req.body, 'baseCount')) {
      const baseCount = Number(req.body.baseCount);
      if (Number.isFinite(baseCount) && baseCount >= 0) {
        settings.donate.baseCount = Math.floor(baseCount);
      }
    }

    settings.updatedAt = Date.now();
    await settings.save();

    const changed = FEATURE_KEYS.filter((key) => current[key] !== next[key]);
    logDonationActivity(req.user.id, 'Donation Features Updated', next);

    res.json({
      success: true,
      data: { ...next, baseCount: settings.donate.baseCount },
      message: changed.length
        ? `Updated: ${changed.join(', ')}`
        : 'Donation features updated',
    });
  } catch (error) {
    console.error('Update donation features error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload the donation QR code (super admin)
// @route   POST /api/superadmin/donation/qr
// @access  Private/SuperAdmin
exports.uploadDonationQR = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const settings = await AdminSettings.getSettings();
    if (!settings.donate) settings.donate = {};

    const previous = settings.donate.qrPhoto;
    settings.donate.qrPhoto = req.file.path;
    settings.updatedAt = Date.now();
    await settings.save();

    // Best effort: remove the replaced asset from Cloudinary.
    if (previous) {
      try {
        const publicId = previous.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/qr/${publicId}`);
      } catch (error) {
        console.log('Old donation QR deletion skipped:', error.message);
      }
    }

    logDonationActivity(req.user.id, 'Donation QR Updated', { url: req.file.path });
    res.json({ success: true, url: req.file.path, message: 'QR code uploaded' });
  } catch (error) {
    console.error('Upload donation QR error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove the donation QR code (super admin)
// @route   DELETE /api/superadmin/donation/qr
// @access  Private/SuperAdmin
exports.deleteDonationQR = async (req, res) => {
  try {
    const settings = await AdminSettings.getSettings();
    const previous = settings.donate?.qrPhoto;

    if (!settings.donate) settings.donate = {};
    settings.donate.qrPhoto = null;
    settings.updatedAt = Date.now();
    await settings.save();

    if (previous) {
      try {
        const publicId = previous.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/qr/${publicId}`);
      } catch (error) {
        console.log('Donation QR cloud deletion skipped:', error.message);
      }
    }

    logDonationActivity(req.user.id, 'Donation QR Removed', {});
    res.json({ success: true, message: 'QR code removed' });
  } catch (error) {
    console.error('Delete donation QR error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// ACCOUNT NUMBER CRUD
// ============================================

const TEXT_FIELDS = [
  'title',
  'bankName',
  'accountHolder',
  'accountNumber',
  'branch',
  'instruction',
  'note',
];
const ACCOUNT_TYPES = ['current', 'savings', 'fixed', 'wallet', 'other'];

const sanitizeAccountPayload = (body = {}, existing = {}) => {
  const payload = {};

  TEXT_FIELDS.forEach((field) => {
    const value = body[field] !== undefined ? body[field] : existing[field];
    payload[field] = value === null || value === undefined ? '' : String(value).trim();
  });

  payload.accountType =
    body.accountType !== undefined || existing.accountType !== undefined
      ? body.accountType || existing.accountType || 'current'
      : 'current';
  if (!ACCOUNT_TYPES.includes(payload.accountType)) payload.accountType = 'current';

  if (body.qrPhoto !== undefined) {
    payload.qrPhoto = body.qrPhoto || null;
  } else if (existing.qrPhoto !== undefined) {
    payload.qrPhoto = existing.qrPhoto;
  }

  payload.active =
    body.active !== undefined ? body.active !== false : existing.active !== false;

  const order =
    body.order !== undefined ? Number(body.order) : Number(existing.order ?? 0);
  payload.order = Number.isFinite(order) ? order : 0;

  return payload;
};

// @desc    List all donation accounts, including inactive ones (super admin)
// @route   GET /api/superadmin/donation/accounts
// @access  Private/SuperAdmin
exports.getAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.find().sort({ order: 1, createdAt: 1 }).lean();
    res.json({ success: true, count: accounts.length, data: accounts });
  } catch (error) {
    console.error('Get donation accounts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add a donation account (super admin)
// @route   POST /api/superadmin/donation/accounts
// @access  Private/SuperAdmin
exports.createAccount = async (req, res) => {
  try {
    const payload = sanitizeAccountPayload(req.body, {});

    if (!payload.accountNumber) {
      return res.status(400).json({ message: 'Account number is required' });
    }

    // Append to the end of the list unless an order was supplied.
    if (req.body.order === undefined) {
      const last = await BankAccount.findOne().sort({ order: -1, createdAt: -1 }).lean();
      payload.order = (last?.order ?? 0) + 1;
    }

    const account = await BankAccount.create(payload);
    logDonationActivity(req.user.id, 'Donation Account Added', {
      accountId: account._id,
      accountNumber: account.accountNumber,
    });

    res.status(201).json({ success: true, data: account, message: 'Account added' });
  } catch (error) {
    console.error('Create donation account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a donation account (super admin)
// @route   PUT /api/superadmin/donation/accounts/:id
// @access  Private/SuperAdmin
exports.updateAccount = async (req, res) => {
  try {
    const account = await BankAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const payload = sanitizeAccountPayload(req.body, account.toObject());
    if (!payload.accountNumber) {
      return res.status(400).json({ message: 'Account number is required' });
    }

    Object.assign(account, payload);
    await account.save();

    logDonationActivity(req.user.id, 'Donation Account Updated', {
      accountId: account._id,
      accountNumber: account.accountNumber,
    });

    res.json({ success: true, data: account, message: 'Account updated' });
  } catch (error) {
    console.error('Update donation account error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a donation account (super admin)
// @route   DELETE /api/superadmin/donation/accounts/:id
// @access  Private/SuperAdmin
exports.deleteAccount = async (req, res) => {
  try {
    const account = await BankAccount.findByIdAndDelete(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Drop the account's own QR from Cloudinary when we can resolve it.
    if (account.qrPhoto) {
      try {
        const publicId = account.qrPhoto.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`temple/qr/${publicId}`);
      } catch (error) {
        console.log('Account QR deletion skipped:', error.message);
      }
    }

    logDonationActivity(req.user.id, 'Donation Account Deleted', {
      accountId: req.params.id,
      accountNumber: account.accountNumber,
    });

    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('Delete donation account error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};
