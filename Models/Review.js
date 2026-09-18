const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true,
  },
  mother: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  babysitter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    default: '',
    maxlength: 2000,
    trim: true,
  },
  babysitterRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null,
  },
  babysitterComment: {
    type: String,
    default: '',
    maxlength: 2000,
    trim: true,
  },
  motherReviewedAt: {
    type: Date,
    default: null,
  },
  babysitterReviewedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
