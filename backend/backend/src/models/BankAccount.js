const mongoose = require('mongoose');

/**
 * A single donation account (bank / wallet) shown on the public donate page.
 * Managed from Admin → Donation Account (super admin only).
 */
const bankAccountSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: '',
      trim: true,
    },
    bankName: {
      type: String,
      default: '',
      trim: true,
    },
    accountHolder: {
      type: String,
      default: '',
      trim: true,
    },
    accountNumber: {
      type: String,
      default: '',
      trim: true,
    },
    accountType: {
      type: String,
      enum: ['current', 'savings', 'fixed', 'wallet', 'other'],
      default: 'current',
    },
    branch: {
      type: String,
      default: '',
      trim: true,
    },
    // Optional per-account QR image (Cloudinary URL)
    qrPhoto: {
      type: String,
      default: null,
    },
    // Donor-facing payment instruction, e.g. "Send the donor name in the
    // transfer remark". Optional.
    instruction: {
      type: String,
      default: '',
      trim: true,
    },
    // Legacy field kept so older records keep rendering; the UI prefers
    // `instruction` and falls back to this.
    note: {
      type: String,
      default: '',
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

bankAccountSchema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model('BankAccount', bankAccountSchema);
