const mongoose = require('mongoose');

/**
 * Fifty lakh in one donation. Declared on the model as well as checked in the
 * route, because the model is the last thing a donation passes through: a
 * request that skipped the form, or a future caller, cannot slip past a rule
 * that only lives in one controller.
 */
const MAX_DONATION = 5_000_000;

const donationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    default: '',
  },
  amount: {
    type: Number,
    default: 0,
    min: 0,
    max: MAX_DONATION,
  },
  // What the donor does for a living, and what their business brings in. Both
  // are asked for on the form: a donation from someone whose means can be
  // accounted for is treated differently by the committee from an anonymous one,
  // so the record keeps what was declared.
  employment: {
    type: String,
    default: '',
    trim: true,
    maxlength: 200,
  },
  businessIncome: {
    type: String,
    default: '',
    trim: true,
    maxlength: 200,
  },
  // The donor's own photograph, captured live in the browser (see the donation
  // form). A Cloudinary address from the upload endpoint, never a URL typed in.
  photo: {
    type: String,
    default: null,
  },
  // When the selfie was taken. Shown in the admin panel so a photograph that
  // looks wrong can be traced back to when it was captured.
  photoCapturedAt: {
    type: Date,
    default: null,
  },
  paymentMethod: {
    type: String,
    enum: ['esewa', 'khalti', 'ips', 'bank', 'cash'],
    default: 'esewa',
  },
  transactionId: {
    type: String,
    default: '',
  },
  // Gateway-side payment reference issued at initiation (Khalti `pidx`), so a
  // verify call can only complete the donation it was created for.
  gatewayRef: {
    type: String,
    default: '',
  },
  // Cloudinary URL of the donor's payment screenshot. Paired with
  // `transactionId`, at least one of the two is required on a manual donation
  // so the admin has something to verify against.
  screenshot: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'rejected'],
    default: 'pending',
  },
  // Set when an admin rejects a donation; shown to the donor in the email.
  rejectionReason: {
    type: String,
    default: '',
    trim: true,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  reviewedBy: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Donation', donationSchema);
module.exports.MAX_DONATION = MAX_DONATION;