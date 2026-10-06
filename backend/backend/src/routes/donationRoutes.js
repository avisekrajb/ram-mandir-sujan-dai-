const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requireArea, hasArea } = require('../middleware/permissions');
const { donationPhotoUpload, paymentScreenshotUpload, userUploadLimiter } = require('../middleware/uploadUserImage');
const Donation = require('../models/Donation');
const { MAX_DONATION } = require('../models/Donation');

/*
 * From this amount up, a donor declares where the money came from and takes a
 * photograph of themselves. Below it neither is asked for. Must stay the same
 * figure as needsDeclaredIncome / WIDE_AMOUNT_FROM in frontend/src/utils/money.js
 * — the form hides the fields at this line and the server stops demanding them,
 * and if the two drift apart a donor is refused for omitting a field they were
 * never shown.
 */
const DECLARED_INCOME_FROM = 1000000;
const User = require('../models/User');
const AdminSettings = require('../models/AdminSettings');
const { MAX_LIST, parsePagination } = require('../utils/listLimits');
const { sendDonationConfirmation, sendDonationConfirmationWithPDF } = require('../services/emailService');
const { generateReceiptPDF } = require('../services/pdfService');
const { getDonationConfig } = require('../controllers/donationAccountController');
const {
  ALLOWED_STATUSES,
  updateDonationStatusById,
} = require('../services/donationStatusService');

// ============================================
// USER ROUTES
// ============================================

// @desc    Upload a payment screenshot (returned URL is sent with the donation)
// @route   POST /api/donations/screenshot
// @access  Private
router.post('/screenshot', protect, userUploadLimiter, paymentScreenshotUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    res.json({ success: true, url: req.file.path });
  } catch (error) {
    console.error('Upload donation screenshot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Upload the donor's own photograph, captured live in the browser
// @route   POST /api/donations/photo
// @access  Private
// Separate from the payment screenshot: this one is kept with the donation record
// and is shown to the committee, so it gets its own folder-sized limit rather
// than riding on the receipt upload.
router.post('/photo', protect, userUploadLimiter, donationPhotoUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }
    res.json({ success: true, url: req.file.path });
  } catch (error) {
    console.error('Upload donor photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create donation (sets status to 'pending' by default)
// @route   POST /api/donations
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      amount,
      paymentMethod,
      name,
      email,
      phone,
      message,
      transactionId,
      screenshot,
      employment,
      businessIncome,
      photo,
    } = req.body;

    // Fifty lakh in one donation. The model carries the same ceiling, so a
    // request that somehow skipped this check still cannot store more.
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'Please enter a donation amount.' });
    }
    if (amountNum > MAX_DONATION) {
      // Says the way out, not just "no": the same wording the three payment
      // gateways use, so the donor is not told one thing and shown another
      // depending on how they chose to pay.
      return res.status(400).json({
        message:
          'A single donation cannot be more than 50 lakh (50,00,000). Please send it as a second donation, one transaction of up to 50 lakh each.',
      });
    }

    /*
     * What the donor declares, and their own photograph — asked for from ten lakh
     * up, and required here from ten lakh up. The threshold is the same one the
     * form uses to decide whether to show them (needsDeclaredIncome in the
     * frontend, the same figure inline below), so the server never refuses a
     * donation for omitting a field the donor was never shown, and never accepts
     * a large one without them. A record the committee cannot check is a record
     * it will not accept, and at this size that is what the declaration is for.
     */
    const needsDeclaredIncome = amountNum >= DECLARED_INCOME_FROM;
    const job = String(employment || '').trim();
    const business = String(businessIncome || '').trim();
    const donorPhoto = String(photo || '').trim();
    if (needsDeclaredIncome && !job) {
      return res.status(400).json({ message: 'Please enter your salary or employment.' });
    }
    if (needsDeclaredIncome && !business) {
      return res.status(400).json({ message: 'Please enter your business income.' });
    }
    if (needsDeclaredIncome && !donorPhoto) {
      return res.status(400).json({ message: 'Please take your photograph. It is required with every donation.' });
    }
    // The donor photo is opened and displayed in the admin panel, so it has to be
    // the address our own upload returned — never an arbitrary one a donor typed
    // into the field.
    let okDonorPhoto = false;
    try {
      const u = new URL(donorPhoto);
      const cloud = process.env.CLOUDINARY_CLOUD_NAME;
      okDonorPhoto = u.protocol === 'https:' && u.hostname === 'res.cloudinary.com' && !u.username && !u.password &&
        (cloud ? u.pathname.startsWith(`/${cloud}/image/`) : /^\/[^/]+\/image\//.test(u.pathname));
    } catch { /* not a URL */ }
    // Checked only when one was expected: below the threshold an empty field is
    // correct, not a problem.
    if (needsDeclaredIncome && !okDonorPhoto) {
      return res.status(400).json({ message: 'Please take your photograph using the camera button.' });
    }

    // A manual donation is only useful if the admin has something to verify it
    // against, so a screenshot, a transaction reference, or both are required.
    // (Gateway donations never come through here — they use /payment/*.)
    const txn = String(transactionId || '').trim();
    const shot = String(screenshot || '').trim();
    // The screenshot is shown (and opened) in the admin panel, so it must be the Cloudinary address the
    // upload endpoint returned, never an arbitrary or script address a donor typed in.
    if (shot) {
      let okShot = false;
      try {
        const u = new URL(shot);
        // Our own Cloudinary account only (another account's files on the same host are not ours),
        // and an uploaded picture: not another kind of file.
        const cloud = process.env.CLOUDINARY_CLOUD_NAME;
        okShot = u.protocol === 'https:' && u.hostname === 'res.cloudinary.com' && !u.username && !u.password &&
          (cloud ? u.pathname.startsWith(`/${cloud}/image/`) : /^\/[^/]+\/image\//.test(u.pathname));
      } catch { /* not a URL */ }
      if (!okShot) {
        return res.status(400).json({ message: 'Please upload the payment screenshot using the upload button.' });
      }
    }
    if (!txn && !shot) {
      return res.status(400).json({
        message:
          'Please upload a payment screenshot or enter the transaction number (at least one is required).',
      });
    }

    const donation = await Donation.create({
      userId: req.user.id,
      name: name || user.name,
      email: email || user.email,
      phone: phone || user.phone || '',
      amount: amountNum,
      // Empty below ten lakh because they were never asked for, not because they
      // were left out; the timestamp likewise only means something with a photo.
      employment: job,
      businessIncome: business,
      photo: donorPhoto || null,
      photoCapturedAt: donorPhoto ? new Date() : null,
      paymentMethod: paymentMethod || 'bank',
      transactionId: txn,
      screenshot: shot || null,
      message: message || '',
      status: 'pending', // Always start as pending; an admin accepts or rejects it
    });

    // Acknowledge receipt of the submission. The acceptance / rejection email
    // goes out later, from the status change.
    try {
      await sendDonationConfirmation(donation, user);
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    res.status(201).json({
      success: true,
      data: donation,
      message: 'Donation submitted successfully. Waiting for admin approval.',
    });
  } catch (error) {
    console.error('Create donation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get user donations
// @route   GET /api/donations/my
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const donations = await Donation.find({ userId: req.user.id }).sort({ date: -1 }).limit(MAX_LIST);
    res.json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (error) {
    console.error('Get my donations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// PUBLIC ROUTES
// ============================================
// These must stay ABOVE `GET /:id`, otherwise the `:id` route swallows them
// and they blow up with a CastError instead of returning the config.

// @desc    Donation config: enabled gateways, account numbers and QR
// @route   GET /api/donations/config
// @access  Public
router.get('/config', getDonationConfig);

// @desc    Get donation settings (public, legacy shape)
// @route   GET /api/donations/settings
// @access  Public
router.get('/settings', async (req, res) => {
  try {
    const settings = await AdminSettings.getSettings();
    // Respect the super admin's switches: hidden bank details / QR must not come out of the API either.
    const showBank = settings.donate?.showBankDetails !== false;
    const showQr = settings.donate?.qrEnabled !== false;
    res.json({
      success: true,
      data: {
        qrPhoto: showQr ? settings.donate?.qrPhoto || null : null,
        baseCount: settings.donate?.baseCount || 0,
        bankNumber: showBank ? settings.donate?.bankNumber || '' : '',
        bankName: showBank ? settings.donate?.bankName || '' : '',
        accountHolder: showBank ? settings.donate?.accountHolder || '' : ''
      }
    });
  } catch (error) {
    console.error('Get donation settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get donation statistics
// @route   GET /api/donations/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const totalDonations = await Donation.countDocuments({ userId: req.user.id });
    const totalAmount = await Donation.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalDonations,
        totalAmount: totalAmount[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get donation stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get donation by ID
// @route   GET /api/donations/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // The donor may read their own donation; staff need the Donations area.
    const isOwner = donation.userId.toString() === req.user.id;
    if (!isOwner && !(['admin', 'superadmin'].includes(req.user.role) && hasArea(req.user, 'donations'))) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({
      success: true,
      data: donation
    });
  } catch (error) {
    console.error('Get donation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

// @desc    Get all donations (admin only)
// @route   GET /api/donations
// @access  Private/Admin
router.get('/', protect, admin, requireArea('donations'), async (req, res) => {
  try {
    const { status, category } = req.query;
    // Clamp ?limit/?page (an unbounded or non-numeric limit used to go straight into the query).
    const { limit, page, skip } = parsePagination(req.query, { defaultLimit: 100, maxLimit: 500 });

    /*
     * The buckets the admin panel files donations into. Read on every request
     * rather than stamped onto each record, so an administrator editing a range
     * sees every donation re-filed immediately.
     */
    const settings = await AdminSettings.getSettings();
    const buckets = (settings?.donationCategories || [])
      .filter((c) => c.enabled !== false)
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const findBucket = (amount) =>
      buckets.find((c) => amount >= (c.min ?? 0) && (c.max === null || c.max === undefined || amount < c.max)) || null;

    let query = {};
    if (status) {
      query.status = String(status);
    }
    // A bucket is a range, not a stored value, so the filter is the range.
    if (category) {
      const bucket = buckets.find((c) => c.key === String(category));
      if (!bucket) {
        return res.status(400).json({ message: 'That donation category no longer exists.' });
      }
      query.amount = { $gte: bucket.min ?? 0 };
      if (bucket.max !== null && bucket.max !== undefined) query.amount.$lt = bucket.max;
    }

    const donations = await Donation.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Donation.countDocuments(query);

    // Counts and totals for every bucket, so the tabs can show what is in each
    // one without the panel asking for them one at a time. Counted on the whole
    // collection, ignoring the current filter: a tab that emptied itself when
    // you selected it would be useless.
    const byCategory = buckets.map((c) => ({
      key: c.key,
      label: c.label,
      min: c.min ?? 0,
      max: c.max ?? null,
      order: c.order || 0,
      range: { $gte: c.min ?? 0, ...(c.max === null || c.max === undefined ? {} : { $lt: c.max }) },
    }));
    const summary = await Promise.all(
      byCategory.map(async (c) => {
        const [agg] = await Donation.aggregate([
          { $match: { amount: c.range } },
          { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
        ]);
        return {
          key: c.key,
          label: c.label,
          min: c.min,
          max: c.max,
          order: c.order,
          count: agg?.count || 0,
          total: agg?.total || 0,
        };
      })
    );

    res.json({
      success: true,
      // Each donation carries the bucket it falls in, worked out now.
      data: donations.map((d) => {
        const bucket = findBucket(d.amount);
        const plain = d.toObject ? d.toObject() : d;
        return { ...plain, categoryKey: bucket ? bucket.key : null };
      }),
      categories: summary,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all donations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update donation status (admin only)
//          Accept or reject; the donor is emailed either way.
// @route   PUT /api/donations/:id/status
// @access  Private/Admin
router.put('/:id/status', protect, admin, requireArea('donations'), async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // All side effects (donor counter, donor email) live in the service so this
    // behaves identically to the admin and super admin endpoints.
    const { donation, emailSent } = await updateDonationStatusById({
      id: req.params.id,
      status,
      rejectionReason,
      adminUser: req.user,
    });

    res.json({
      success: true,
      data: donation,
      message: `Donation status updated to ${status}${emailSent ? ' and the donor was notified' : ''}`,
    });
  } catch (error) {
    console.error('Update donation status error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
  }
});

// @desc    Delete donation (admin only)
// @route   DELETE /api/donations/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, requireArea('donations'), async (req, res) => {
  try {
    const donation = await Donation.findByIdAndDelete(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    
    res.json({
      success: true,
      message: 'Donation deleted successfully'
    });
  } catch (error) {
    console.error('Delete donation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// EMAIL ROUTES
// ============================================

// @desc    Send donation confirmation email (admin only)
// @route   POST /api/donations/send-email
// @access  Private/Admin
router.post('/send-email', protect, admin, requireArea('donations'), async (req, res) => {
  try {
    const { donationId } = req.body;
    
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    
    const user = await User.findById(donation.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await sendDonationConfirmation(donation, user);
    
    res.json({
      success: true,
      message: 'Email sent successfully'
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

// @desc    Send donation confirmation email with PDF receipt (admin only)
// @route   POST /api/donations/send-email-with-pdf
// @access  Private/Admin
router.post('/send-email-with-pdf', protect, admin, requireArea('donations'), async (req, res) => {
  try {
    const { donationId } = req.body;
    
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    
    const user = await User.findById(donation.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const pdfBuffer = await generateReceiptPDF(donation, user);
    await sendDonationConfirmationWithPDF(donation, user, pdfBuffer);
    
    res.json({
      success: true,
      message: 'Email with PDF sent successfully'
    });
  } catch (error) {
    console.error('Send email with PDF error:', error);
    res.status(500).json({ message: 'Failed to send email with PDF' });
  }
});

// @desc    Send donation confirmation email with PDF to user (user can request)
// @route   POST /api/donations/:id/email-receipt
// @access  Private
router.post('/:id/email-receipt', protect, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    
    if (donation.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (donation.status !== 'completed') {
      return res.status(400).json({ message: 'Receipt only available for completed donations' });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const pdfBuffer = await generateReceiptPDF(donation, user);
    await sendDonationConfirmationWithPDF(donation, user, pdfBuffer);
    
    res.json({
      success: true,
      message: 'Receipt sent to your email'
    });
  } catch (error) {
    console.error('Send receipt error:', error);
    res.status(500).json({ message: 'Failed to send receipt' });
  }
});

module.exports = router;