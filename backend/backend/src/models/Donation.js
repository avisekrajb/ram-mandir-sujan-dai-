const mongoose = require('mongoose');

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