/**
 * Donation status changes.
 *
 * Three separate handlers used to own this logic (adminController,
 * superAdminController and donationRoutes) and they had drifted apart:
 *
 *   - only one of them captured the previous status, so the others re-ran the
 *     "completed" side effects — bumping the public donor counter and mailing a
 *     fresh receipt — every time an admin re-submitted the same status;
 *   - the super admin path sent no email at all;
 *   - `rejected` was not an allowed value anywhere, so a donation could not be
 *     turned down and the donor was never told.
 *
 * Everything now lives here so all three entry points behave identically.
 */

const Donation = require('../models/Donation');
const AdminSettings = require('../models/AdminSettings');
const User = require('../models/User');
const { generateReceiptPDF } = require('./pdfService');
const { sendDonationStatusEmail } = require('./emailService');

const ALLOWED_STATUSES = ['pending', 'completed', 'failed', 'refunded', 'rejected'];

/**
 * Statuses that mean the donation counts towards the public donor total.
 * `rejected` / `failed` / `refunded` must not, otherwise a reversed donation
 * would stay in the count forever.
 */
const COUNTS_TOWARD_TOTAL = new Set(['completed']);

/**
 * Increment the public donor counter exactly once per transition into a
 * counting status.
 */
const bumpDonorCount = async () => {
  try {
    const settings = await AdminSettings.getSettings();
    if (settings.donate) {
      settings.donate.baseCount = (settings.donate.baseCount || 0) + 1;
      await settings.save();
    }
  } catch (error) {
    // Housekeeping: never fail the admin's status change over the counter.
    console.error('Donor count update error:', error.message);
  }
};

/**
 * Apply a status change to a donation.
 *
 * @param {Object}  options
 * @param {Object}  options.donation        the Donation document (must be saved-able)
 * @param {string}  options.status          the new status
 * @param {string}  options.rejectionReason only meaningful for 'rejected'
 * @param {Object}  options.adminUser       the acting admin (JWT payload)
 * @returns {Promise<{donation: Object, changed: boolean, previousStatus: string, emailSent: boolean}>}
 * @throws  {Error & {statusCode: number}} on an invalid status
 */
const applyDonationStatus = async ({
  donation,
  status,
  rejectionReason = '',
  adminUser = null,
}) => {
  if (!ALLOWED_STATUSES.includes(status)) {
    const error = new Error('Invalid status');
    error.statusCode = 400;
    throw error;
  }

  const previousStatus = donation.status;
  const changed = previousStatus !== status;

  donation.status = status;
  donation.rejectionReason = status === 'rejected' ? String(rejectionReason || '').trim() : '';
  if (changed) {
    donation.reviewedAt = new Date();
    donation.reviewedBy = adminUser?.name || '';
  }
  // `.save()` rather than `findByIdAndUpdate` so the enum on the schema is
  // actually enforced.
  await donation.save();

  let emailSent = false;

  if (changed) {
    if (COUNTS_TOWARD_TOTAL.has(status) && !COUNTS_TOWARD_TOTAL.has(previousStatus)) {
      await bumpDonorCount();
    }

    // The donor is told either way. `sendEmail` never throws, so a mail server
    // outage cannot roll back the status change.
    try {
      const user = await User.findById(donation.userId);
      const recipient = user || { name: donation.name, email: donation.email };

      // Only an accepted donation gets the printable receipt attached, and the
      // PDF is built in its own try/catch: a PDF failure must never stop the
      // notification going out.
      let pdfBuffer = null;
      if (status === 'completed') {
        try {
          pdfBuffer = await generateReceiptPDF(donation, user || {}, {
            title: 'OFFICIAL DONATION RECEIPT',
            watermarkText: 'ACCEPTED',
            note: 'Accepted and verified by the temple committee.',
          });
        } catch (pdfError) {
          console.error('Receipt PDF generation failed:', pdfError.message);
        }
      }

      const result = await sendDonationStatusEmail(donation, recipient, {
        status,
        rejectionReason: donation.rejectionReason,
        pdfBuffer,
      });
      emailSent = !result?.error;
    } catch (emailError) {
      console.error('Donation status email error:', emailError);
    }
  }

  return { donation, changed, previousStatus, emailSent };
};

/** Convenience wrapper: load by id, then apply. */
const updateDonationStatusById = async ({ id, status, rejectionReason, adminUser }) => {
  const donation = await Donation.findById(id);
  if (!donation) {
    const error = new Error('Donation not found');
    error.statusCode = 404;
    throw error;
  }
  return applyDonationStatus({ donation, status, rejectionReason, adminUser });
};

module.exports = {
  ALLOWED_STATUSES,
  applyDonationStatus,
  updateDonationStatusById,
};
