const User = require('../Models/Users');

const getUserId = (req) => req.user?.id || req.user?._id;
const sanitizeProfile = (user) => ({
  _id: user._id,
  FirstName: user.FirstName,
  LastName: user.LastName,
  Email: user.Email,
  Gender: user.Gender,
  Phone: user.Phone,
  zipCode: user.zipCode,
  Address: user.Address,
  hourlyRate: user.hourlyRate,
  about: user.about,
  state: user.state,
  city: user.city,
  picture: user.picture,
  sendEmail: user.sendEmail,
  sendPhone: user.sendPhone,
  no: user.no,
  ratingAverage: user.ratingAverage,
  ratingCount: user.ratingCount,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'FirstName', 'LastName', 'Gender', 'Phone', 'zipCode', 'Address',
      'about', 'state', 'city', 'sendEmail', 'sendPhone', 'no', 'hourlyRate',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (typeof req.body[field] !== 'undefined') updates[field] = req.body[field];
    }

    if (req.user.role === 'Babysitter' && typeof updates.hourlyRate !== 'undefined') {
      updates.hourlyRate = Number(updates.hourlyRate);
      if (!Number.isFinite(updates.hourlyRate) || updates.hourlyRate <= 0) {
        return res.status(400).json({ message: 'hourlyRate must be greater than zero.' });
      }
    }
    if (req.file?.path) updates.picture = req.file.path;

    const user = await User.findByIdAndUpdate(getUserId(req), updates, {
      new: true,
      runValidators: true,
    });
    return res.status(200).json({ message: 'Profile updated successfully.', user: sanitizeProfile(user) });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ message: 'Error updating profile.', error: error.message });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(getUserId(req)).select('-Password -resetPasswordToken -resetPasswordExpires -pushTokens -stripeAccountId');
    return res.status(200).json({ user });
  } catch (error) {
    console.error('getMyProfile error:', error);
    return res.status(500).json({ message: 'Error fetching profile.', error: error.message });
  }
};
