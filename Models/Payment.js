const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'usd'
  },
  stripePaymentId: {
    type: String,
    default: ''
  },
  paymentIntentId: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'refunded'],
    default: 'pending'
  },
  userEmail: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  payoutStatus: {
    type: String,
    enum: ['not_requested', 'requested', 'paid'],
    default: 'not_requested'
  },
  payoutRequestedAt: {
    type: Date,
    default: null
  },
  payoutTransferId: {
    type: String,
    default: ''
  },
  stripeRefundId: {
    type: String,
    default: ''
  },
  refundedAmount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
