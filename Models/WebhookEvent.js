const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    default: 'stripe',
  },
  eventId: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    required: true,
  },
  processedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
