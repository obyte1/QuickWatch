const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    default: 'system',
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  readAt: {
    type: Date,
    default: null,
  },
  pushStatus: {
    type: String,
    enum: ['not_attempted', 'sent', 'failed', 'no_device'],
    default: 'not_attempted',
  },
  pushError: {
    type: String,
    default: '',
  },
}, { timestamps: true });

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
