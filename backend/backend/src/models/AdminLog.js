const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  action: { type: String, default: '' },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  user: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
});

adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ adminId: 1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
