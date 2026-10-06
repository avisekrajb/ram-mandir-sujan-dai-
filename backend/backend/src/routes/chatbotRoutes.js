const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const {
  getMessages,
  saveMessage,
  clearMessages,
} = require('../controllers/chatbotController');

// @route   GET /api/chatbot/messages
// @desc    Get all chat messages for the logged-in user
// @access  Private
router.get('/messages', protect, getMessages);

// @route   POST /api/chatbot/messages
// @desc    Save a single chat message
// @access  Private
router.post('/messages', protect, saveMessage);

// @route   DELETE /api/chatbot/messages
// @desc    Clear all chat messages for the logged-in user
// @access  Private
router.delete('/messages', protect, clearMessages);

module.exports = router;