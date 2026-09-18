const Review = require('../Models/Review');
const User = require('../Models/Users');

const updateRatingAggregate = async (userId, field) => {
  const match = { [field]: { $gte: 1 } };
  const [summary] = await Review.aggregate([
    { $match: match },
    { $match: field === 'rating' ? { babysitter: userId } : { mother: userId } },
    { $group: { _id: field, ratingAverage: { $avg: `$${field}` }, ratingCount: { $sum: 1 } } },
  ]);

  await User.findByIdAndUpdate(userId, {
    ratingAverage: summary?.ratingAverage || 0,
    ratingCount: summary?.ratingCount || 0,
  });
  return summary || { ratingAverage: 0, ratingCount: 0 };
};

module.exports = { updateRatingAggregate };
