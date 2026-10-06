const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const {
  initiateEsewaPayment,
  verifyEsewaPayment,
  initiateKhaltiPayment,
  verifyKhaltiPayment,
  initiateIpsPayment,
  verifyIpsPayment,
  getDonationStatus,
} = require('../controllers/paymentController');

router.post('/esewa/initiate', protect, initiateEsewaPayment);
router.post('/esewa/verify', protect, verifyEsewaPayment);

router.post('/khalti/initiate', protect, initiateKhaltiPayment);
router.post('/khalti/verify', protect, verifyKhaltiPayment);

router.post('/ips/initiate', protect, initiateIpsPayment);
router.post('/ips/verify', protect, verifyIpsPayment);

router.get('/status/:donationId', protect, getDonationStatus);

module.exports = router;