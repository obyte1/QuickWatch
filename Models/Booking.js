const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  selectedStartDate: {
    type: String,
    default: ''
  },
  startTime: {
    type: String,
    default: ''
  },
  endTime: {
    type: String,
    default: ''
  },
  watcherRole: {
    type: String,
    default: ''
  },
  motherName: {
    type: String,
    default: ''
  },
  childNo: {
    type: Number,
    default: 0
  },
  childOption2: {
    type: String,
    default: ''
  },
  rateHour: {
    type: String,
    default: ''
  },
  requestedAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  companyFeePerHour: {
    type: Number,
    min: 0,
    default: 0
  },
  sitterHourlyRate: {
    type: Number,
    min: 0,
    default: 0
  },
  serviceAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  companyFee: {
    type: Number,
    min: 0,
    default: 0
  },
  totalAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  childrenDescription: {
    type: String,
    default: ''
  },
  specialInstructions: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  emailTo: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  zipcode: {
    type: String,
    default: ''
  },
  picture: {
    type: String,
    default: ''
  },
  picture2: {
    type: String,
    default: ''
  },
  watcherName: {
    type: String,
    default: ''
  },
  status: {
    type: Boolean,
    default: false
  },
  confirm: {
    type: Boolean,
    default: false
  },
  lifecycleStatus: {
    type: String,
    enum: ['requested', 'accepted', 'declined', 'inProgress', 'completed', 'cancelled', 'refunded'],
    default: 'requested',
    index: true
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  refundedAt: {
    type: Date,
    default: null
  },
  paymentStatus: {
    type: String,
    enum: ['not_started', 'pending', 'paid', 'failed'],
    default: 'not_started'
  },
  motherConfirmedAt: {
    type: Date,
    default: null
  },
  payoutStatus: {
    type: String,
    enum: ['not_ready', 'requested', 'paid'],
    default: 'not_ready'
  },
  payoutRequestedAt: {
    type: Date,
    default: null
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  mother: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  babysitter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

bookingSchema.index({ babysitter: 1, selectedStartDate: 1, startTime: 1, endTime: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
