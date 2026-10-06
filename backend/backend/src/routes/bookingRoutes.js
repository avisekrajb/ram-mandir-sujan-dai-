const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { hasArea } = require('../middleware/permissions');
const Booking = require('../models/Booking');
const User = require('../models/User');
const AdminSettings = require('../models/AdminSettings');
const { sendBookingConfirmation } = require('../services/emailService');
const { MAX_LIST } = require('../utils/listLimits');

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    // Check if booking is available
    const settings = await AdminSettings.getSettings();
    if (settings.bookingAvailable === false) {
      return res.status(403).json({ 
        message: settings.availabilityMessage || 'Bookings are currently unavailable' 
      });
    }

    const { name, phone, date, type, description } = req.body;
    const user = await User.findById(req.user.id);

    // Plain text, bounded: these values are stored, shown to admins and put in e-mails.
    const isText = (v, max) => v === undefined || v === null || (typeof v === 'string' && v.length <= max);
    if (!isText(name, 100) || !isText(phone, 30) || !isText(description, 1000) || typeof type !== 'string' || type.length > 100 || typeof date !== 'string') {
      return res.status(400).json({ message: 'Please check the booking details.' });
    }
    // The ceremony must be one the temple actually offers.
    const offered = Array.isArray(settings.pujaTypes) ? settings.pujaTypes.map((p) => String(p).trim()) : [];
    if (offered.length > 0 && !offered.includes(type.trim())) {
      return res.status(400).json({ message: 'Please choose a valid ceremony.' });
    }

    // Validate date - exactly YYYY-MM-DD (the per-day limits below are keyed by this exact text, so
    // "10/10/2030" or "2030-10-10 " must not slip past them), and a real calendar day.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const utcDay = new Date(`${date}T00:00:00Z`);
    const isRealDay = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(utcDay.getTime()) && utcDay.toISOString().slice(0, 10) === date;
    if (!isRealDay) {
      return res.status(400).json({ message: 'Please select a valid date.' });
    }
    const bookingDate = new Date(`${date}T00:00:00`);
    bookingDate.setHours(0, 0, 0, 0);
    
    if (bookingDate < today) {
      return res.status(400).json({ 
        message: 'Cannot book for past dates. Please select a future date.' 
      });
    }

    // Check date limit
    const dateLimit = settings.dateLimits
      ? (typeof settings.dateLimits.get === 'function' ? settings.dateLimits.get(date) : settings.dateLimits[date])
      : undefined;
    if (dateLimit !== undefined && dateLimit !== null) {
      const limit = Number(dateLimit);
      // If limit is 0 or less, prevent booking
      if (limit <= 0) {
        return res.status(400).json({ 
          message: `Booking limit reached for ${date}. No slots available.` 
        });
      }
      
      const bookingsCount = await Booking.countDocuments({ date });
      if (bookingsCount >= limit) {
        return res.status(400).json({ 
          message: `Booking limit reached for ${date}. Maximum ${limit} bookings allowed.` 
        });
      }
    }

    const booking = await Booking.create({
      userId: req.user.id,
      name: (name || user.name || '').trim(),
      phone: (phone || user.phone || '').trim(),
      email: user.email,
      date,
      type: type.trim(),
      description: (description || '').trim(),
      status: 'pending',
    });

    // Send confirmation email
    try {
      await sendBookingConfirmation(booking, user);
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get user bookings
// @route   GET /api/bookings/my
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all bookings (admin only)
// @route   GET /api/bookings
// @access  Private/Admin
router.get('/', protect, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (!hasArea(req.user, 'bookings')) {
      return res.status(403).json({ message: 'You do not have access to bookings.', code: 'NO_AREA_ACCESS', area: 'bookings' });
    }
    const bookings = await Booking.find().sort({ createdAt: -1 }).limit(MAX_LIST);
    res.json(bookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;