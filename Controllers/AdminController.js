const User = require('../Models/Users');
const Booking = require('../Models/Booking');
const Payment = require('../Models/Payment');
const sendEmail = require('../Middleware/emailsender');
const { approvalTemplate } = require('../Middleware/emailTemplates');
const { notifyUser } = require('../Services/notificationService');

const safeUser = (user) => ({
  _id: user._id,
  FirstName: user.FirstName,
  LastName: user.LastName,
  Email: user.Email,
  Phone: user.Phone,
  role: user.role,
  status: user.status,
  hourlyRate: user.hourlyRate,
  about: user.about,
  picture: user.picture,
  ratingAverage: user.ratingAverage,
  ratingCount: user.ratingCount,
  city: user.city,
  state: user.state,
  createdAt: user.createdAt,
});

exports.getOverview = async (req, res) => {
  try {
    const [users, bookings, payments, payoutRequests, revenue] = await Promise.all([
      User.countDocuments(),
      Booking.countDocuments(),
      Payment.countDocuments({ status: 'succeeded' }),
      Booking.countDocuments({ payoutStatus: 'requested' }),
      Payment.aggregate([
        { $match: { status: 'succeeded' } },
        { $group: { _id: '$currency', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    return res.status(200).json({
      users,
      bookings,
      successfulPayments: payments,
      pendingPayoutRequests: payoutRequests,
      revenue,
    });
  } catch (error) {
    console.error('getOverview error:', error);
    return res.status(500).json({ message: 'Error fetching admin overview.', error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) {
      const roleAliases = { babysitter: 'Babysitter', sitter: 'Babysitter', mother: 'Mother', admin: 'Admin' };
      const roles = String(req.query.role)
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean)
        .map((role) => roleAliases[role.toLowerCase()] || role);
      filter.role = roles.length > 1 ? { $in: roles } : roles[0];
    }
    if (req.query.status) {
      const statuses = String(req.query.status).split(',').map((status) => status.trim()).filter(Boolean);
      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }
    const users = await User.find(filter)
      .select('-Password -resetPasswordToken -resetPasswordExpires -pushTokens -stripeAccountId')
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ count: users.length, users: users.map(safeUser) });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ message: 'Error fetching users.', error: error.message });
  }
};

exports.getBabysitterById = async (req, res) => {
  try {
    const babysitter = await User.findOne({ _id: req.params.id, role: 'Babysitter' })
      .select('-Password -resetPasswordToken -resetPasswordExpires -pushTokens -stripeAccountId')
      .lean();
    if (!babysitter) return res.status(404).json({ message: 'Babysitter not found.' });
    return res.status(200).json({ babysitter: safeUser(babysitter) });
  } catch (error) {
    console.error('getBabysitterById error:', error);
    return res.status(500).json({ message: 'Error fetching babysitter.', error: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { status, reason = '' } = req.body;
    const allowedStatuses = ['Active', 'Rejected', 'Suspended', 'pendingReview'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowedStatuses.join(', ')}.` });
    }
    if (status === 'Rejected' && !String(reason).trim()) {
      return res.status(400).json({ message: 'reason is required when rejecting an account.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (status === 'pendingReview' && user.role !== 'Babysitter') {
      return res.status(400).json({ message: 'Only babysitter accounts can be pending review.' });
    }

    user.status = status;
    await user.save();

    const isApproval = status === 'Active';
    const subject = isApproval ? 'Your QuickWatch account has been approved' : `Your QuickWatch account is ${status}`;
    const message = isApproval
      ? 'Your QuickWatch account has been approved and is now active.'
      : status === 'Rejected'
        ? `Your babysitter application was rejected. Reason: ${reason}`
        : `Your QuickWatch account status is now ${status}.`;
    const html = isApproval
      ? approvalTemplate({ firstName: user.FirstName, role: user.role })
      : `<p>Hello ${user.FirstName},</p><p>${message}</p>${reason ? `<p>Reason: ${reason}</p>` : ''}<p>Regards,<br />QuickWatch</p>`;

    await sendEmail(user.Email, subject, html, message);
    await notifyUser({
      userId: user._id,
      type: isApproval ? 'account.approved' : `account.${status.toLowerCase()}`,
      title: subject,
      message,
      data: { userId: user._id.toString(), status, action: 'view_account' },
    });

    return res.status(200).json({ message: `User status updated to ${status}.`, user: safeUser(user) });
  } catch (error) {
    console.error('admin updateUserStatus error:', error);
    return res.status(500).json({ message: 'Error updating user status.', error: error.message });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.lifecycleStatus = req.query.status;
    if (req.query.payoutStatus) filter.payoutStatus = req.query.payoutStatus;
    const bookings = await Booking.find(filter)
      .populate('mother', 'FirstName LastName Email')
      .populate('babysitter', 'FirstName LastName Email')
      .sort({ createdAt: -1 });
    return res.status(200).json({ count: bookings.length, bookings });
  } catch (error) {
    console.error('getBookings error:', error);
    return res.status(500).json({ message: 'Error fetching bookings.', error: error.message });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.payoutStatus) filter.payoutStatus = req.query.payoutStatus;
    const payments = await Payment.find(filter)
      .populate('user', 'FirstName LastName Email')
      .populate('booking')
      .sort({ createdAt: -1 });
    return res.status(200).json({ count: payments.length, payments });
  } catch (error) {
    console.error('getPayments error:', error);
    return res.status(500).json({ message: 'Error fetching payments.', error: error.message });
  }
};
