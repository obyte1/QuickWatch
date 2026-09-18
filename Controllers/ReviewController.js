const Booking = require('../Models/Booking');
const Review = require('../Models/Review');
const User = require('../Models/Users');
const { notifyUser } = require('../Services/notificationService');
const { updateRatingAggregate } = require('../Utility/reviewAggregates');

const getUserId = (req) => req.user?.id || req.user?._id;

exports.createReview = async (req, res) => {
  try {
    const { rating, comment = '' } = req.body;
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'rating must be an integer from 1 to 5.' });
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.lifecycleStatus !== 'completed' && !booking.motherConfirmedAt) {
      return res.status(409).json({ message: 'Reviews are available after the booking is completed.' });
    }

    const reviewerId = getUserId(req).toString();
    const isMother = booking.mother?.toString() === reviewerId;
    const isBabysitter = booking.babysitter?.toString() === reviewerId;
    if (!isMother && !isBabysitter) {
      return res.status(403).json({ message: 'Only the mother or babysitter assigned to this booking can review it.' });
    }

    let review = await Review.findOne({ booking: booking._id });
    if (!review) {
      review = new Review({ booking: booking._id, mother: booking.mother, babysitter: booking.babysitter });
    }

    let summary;
    let revieweeId;
    if (isMother) {
      if (review.motherReviewedAt) return res.status(409).json({ message: 'The mother has already reviewed this booking.' });
      review.rating = numericRating;
      review.comment = comment;
      review.motherReviewedAt = new Date();
      revieweeId = booking.babysitter;
      await review.save();
      summary = await updateRatingAggregate(booking.babysitter, 'rating');
    } else {
      if (review.babysitterReviewedAt) return res.status(409).json({ message: 'The babysitter has already reviewed this booking.' });
      review.babysitterRating = numericRating;
      review.babysitterComment = comment;
      review.babysitterReviewedAt = new Date();
      revieweeId = booking.mother;
      await review.save();
      summary = await updateRatingAggregate(booking.mother, 'babysitterRating');
    }

    notifyUser({
      userId: revieweeId,
      type: 'review.created',
      title: 'New review received',
      message: isMother ? 'A mother left a review for your completed booking.' : 'A babysitter left a review for you.',
      data: { bookingId: booking._id.toString(), reviewId: review._id.toString(), action: 'view_reviews' },
    }).catch((error) => console.error('review notification error:', error.message));

    return res.status(201).json({ message: 'Review submitted.', review, reviewee: isMother ? 'Babysitter' : 'Mother', ratingAverage: summary.ratingAverage, ratingCount: summary.ratingCount });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'This booking has already been reviewed.' });
    console.error('createReview error:', error);
    return res.status(500).json({ message: 'Error creating review.', error: error.message });
  }
};

exports.getBabysitterReviews = async (req, res) => {
  try {
    const sitter = await User.findOne({ _id: req.params.babysitterId, role: 'Babysitter' })
      .select('FirstName LastName picture ratingAverage ratingCount');
    if (!sitter) return res.status(404).json({ message: 'Babysitter not found.' });
    const reviews = await Review.find({ babysitter: sitter._id, motherReviewedAt: { $ne: null } })
      .populate('mother', 'FirstName LastName')
      .sort({ createdAt: -1 });
    return res.status(200).json({ sitter, count: reviews.length, reviews });
  } catch (error) {
    console.error('getBabysitterReviews error:', error);
    return res.status(500).json({ message: 'Error fetching reviews.', error: error.message });
  }
};

exports.getMotherReviews = async (req, res) => {
  try {
    const mother = await User.findOne({ _id: req.params.motherId, role: 'Mother' })
      .select('FirstName LastName picture ratingAverage ratingCount');
    if (!mother) return res.status(404).json({ message: 'Mother not found.' });
    const reviews = await Review.find({ mother: mother._id, babysitterReviewedAt: { $ne: null } })
      .populate('babysitter', 'FirstName LastName picture')
      .sort({ createdAt: -1 });
    return res.status(200).json({ mother, count: reviews.length, reviews });
  } catch (error) {
    console.error('getMotherReviews error:', error);
    return res.status(500).json({ message: 'Error fetching mother reviews.', error: error.message });
  }
};
