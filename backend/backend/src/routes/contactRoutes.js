const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const protect = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requireArea } = require('../middleware/permissions');
const { sendContactReply } = require('../services/emailService');
const { parsePagination } = require('../utils/listLimits');
const rateLimit = require('../middleware/rateLimit');
const validator = require('validator');
const { checkFields, REASON_MESSAGES } = require('../utils/messageFilter');

// Every attempt counts, including ones the filter turns away. The ceiling is
// generous for people retrying a rejected message, but stops a script.
const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many messages sent. Please try again in a few minutes.',
});

// ============================================
// PUBLIC ROUTES
// ============================================

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
router.post('/', submitLimiter, async (req, res) => {
  try {
    const { name, email, message, hp_field: honeypot } = req.body || {};

    // Hidden field only bots fill in: pretend it worked, store nothing.
    if (honeypot) {
      return res.status(201).json({ success: true, message: 'Message sent successfully' });
    }

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
      return res.status(400).json({ message: 'Invalid input' });
    }
    if (name.length > 100 || email.length > 200 || message.length > 2000) {
      return res.status(400).json({ message: 'Message is too long' });
    }
    // One plain address: the admin's reply is mailed to it, and a comma-separated value would mail several people.
    if (!validator.isEmail(email.trim()) || /[,;<>" ]/.test(email.trim())) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Rude words, links, promotional text and meaningless text are turned away
    // with the reason, so the website can show it next to the right field.
    const verdict = checkFields({ name, message });
    if (!verdict.ok) {
      return res.status(400).json({
        success: false,
        code: 'content_rejected',
        field: verdict.field,
        reason: verdict.reason,
        message: REASON_MESSAGES[verdict.reason],
      });
    }

    const contact = await Contact.create({
      name,
      email: email.trim(),
      message,
      status: 'pending',
    });
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: contact,
    });
  } catch (error) {
    console.error('Contact submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================
// ADMIN ROUTES - ORDER MATTERS!
// ============================================

// @desc    Get contact statistics - MUST COME BEFORE /:id
// @route   GET /api/contact/stats
// @access  Private/Admin
router.get('/stats', protect, admin, requireArea('contact'), async (req, res) => {
  try {
    const total = await Contact.countDocuments();
    const pending = await Contact.countDocuments({ status: 'pending' });
    const read = await Contact.countDocuments({ status: 'read' });
    const replied = await Contact.countDocuments({ status: 'replied' });
    
    res.json({
      success: true,
      data: {
        total,
        pending,
        read,
        replied,
      },
    });
  } catch (error) {
    console.error('Get contact stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Bulk delete contact messages - MUST COME BEFORE /:id
// @route   DELETE /api/contact/bulk
// @access  Private/Admin
router.delete('/bulk', protect, admin, requireArea('contact'), async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide an array of IDs' 
      });
    }
    
    const result = await Contact.deleteMany({ _id: { $in: ids } });
    
    res.json({
      success: true,
      message: `${result.deletedCount} messages deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Bulk delete contact error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Private/Admin
router.get('/', protect, admin, requireArea('contact'), async (req, res) => {
  try {
    const { status } = req.query;
    // Clamp ?limit/?page (an unbounded or non-numeric limit used to go straight into the query).
    const { limit, page, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 500 });

    let query = {};
    if (status && status !== 'all') {
      query.status = String(status);
    }

    const messages = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Contact.countDocuments(query);
    
    res.json({
      success: true,
      data: messages,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get contact messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single contact message - MUST COME AFTER ALL SPECIFIC ROUTES
// @route   GET /api/contact/:id
// @access  Private/Admin
router.get('/:id', protect, admin, requireArea('contact'), async (req, res) => {
  try {
    const message = await Contact.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (message.status === 'pending') {
      message.status = 'read';
      await message.save();
    }
    
    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('Get contact message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Reply to contact message
// @route   POST /api/contact/:id/reply
// @access  Private/Admin
router.post('/:id/reply', protect, admin, requireArea('contact'), async (req, res) => {
  try {
    const { reply } = req.body;
    const { id } = req.params;
    
    if (!reply || reply.trim().length < 2) {
      return res.status(400).json({ message: 'Reply message is required' });
    }
    
    const message = await Contact.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    message.reply = reply.trim();
    message.status = 'replied';
    message.repliedAt = Date.now();
    message.repliedBy = req.user.name || req.user.email || 'Admin';
    await message.save();
    
    // Send reply email
    try {
      await sendContactReply(message, reply.trim());
      console.log(`✅ Reply email sent to ${message.email}`);
    } catch (emailError) {
      console.error('Email error:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: message,
    });
  } catch (error) {
    console.error('Reply to contact error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete contact message
// @route   DELETE /api/contact/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, requireArea('contact'), async (req, res) => {
  try {
    const message = await Contact.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Delete contact message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;