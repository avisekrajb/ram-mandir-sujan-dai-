const ChatMessage = require('../models/ChatMessage');

const RETENTION_DAYS = ChatMessage.CHAT_RETENTION_DAYS || 30;

/*
 * Drop everything past the retention window. The TTL index on the collection is
 * the real mechanism, but the TTL monitor does not run on every hosting tier
 * (Atlas's free tier leaves it off) and is allowed to lag, so the app enforces
 * the same rule itself.
 *
 * At most once an hour: the delete is a single indexed range scan, and running
 * it on every message would be pointless work on a busy chatbot.
 */
let lastPruneAt = 0;
const pruneExpiredMessages = async () => {
  if (Date.now() - lastPruneAt < 60 * 60 * 1000) return;
  lastPruneAt = Date.now();
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await ChatMessage.deleteMany({ createdAt: { $lt: cutoff } });
    if (result.deletedCount > 0) {
      console.log(`Chatbot: removed ${result.deletedCount} message(s) older than ${RETENTION_DAYS} days`);
    }
  } catch (error) {
    // Housekeeping must never break a chat.
    console.error('Chatbot prune error:', error.message);
    lastPruneAt = 0; // try again on the next message
  }
};

// @desc    Get all chat messages for the logged-in user
// @route   GET /api/chatbot/messages
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    pruneExpiredMessages();

    // A visitor whose whole conversation has expired starts a fresh one rather
    // than being shown an empty bubble: the retention rule should read as "old
    // chats are gone", not as a broken widget.
    const messages = await ChatMessage.find({ user: req.user._id })
      .sort({ createdAt: 1 })
      .limit(200);

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Save a single chat message
// @route   POST /api/chatbot/messages
// @access  Private
exports.saveMessage = async (req, res) => {
  try {
    pruneExpiredMessages();

    const { sender, text, language } = req.body;

    if (!sender || !['user', 'bot'].includes(sender)) {
      return res.status(400).json({ success: false, message: 'Invalid sender' });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const message = await ChatMessage.create({
      user: req.user._id,
      sender,
      text: text.trim(),
      language: language || 'en',
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('Save chat message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Clear all chat messages for the logged-in user
// @route   DELETE /api/chatbot/messages
// @access  Private
exports.clearMessages = async (req, res) => {
  try {
    const result = await ChatMessage.deleteMany({ user: req.user._id });

    res.json({
      success: true,
      message: `${result.deletedCount} messages cleared`,
    });
  } catch (error) {
    console.error('Clear chat messages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};