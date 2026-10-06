const mongoose = require('mongoose');

// How long a conversation is kept. Chat transcripts are personal data and are
// of no use to the temple once the visitor has moved on, so each message is
// dropped 30 days after it was written.
const CHAT_RETENTION_DAYS = 30;

const chatMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sender: {
    type: String,
    enum: ['user', 'bot'],
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  language: {
    type: String,
    default: 'en',
  },
}, {
  timestamps: true,
});

/*
 * MongoDB removes each message on its own once it passes the retention window,
 * so nothing has to be swept by a job. The controller also prunes on write,
 * because the TTL monitor is not available on every hosting tier (Atlas's free
 * tier does not run it) and can lag by about a minute.
 */
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: CHAT_RETENTION_DAYS * 24 * 60 * 60 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
module.exports.CHAT_RETENTION_DAYS = CHAT_RETENTION_DAYS;