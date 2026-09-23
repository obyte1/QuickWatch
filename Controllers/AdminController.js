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

const resolveStatusUpdate = (body = {}) => {
  const actionMap = {
    approve: 'Active',
    approved: 'Active',
    reject: 'Rejected',
    rejected: 'Rejected',
    suspend: 'Suspended',
    suspended: 'Suspended',
    review: 'pendingReview',
    pendingreview: 'pendingReview',
    'return-to-review': 'pendingReview',
  };

  const rawStatus = typeof body.status !== 'undefined' ? body.status : body.action;
  const resolvedStatus = typeof rawStatus === 'string' ? actionMap[rawStatus.toLowerCase()] || rawStatus : null;

  return {
    status: resolvedStatus,
    reason: typeof body.reason === 'string' ? body.reason : '',
  };
};

module.exports.resolveStatusUpdate = resolveStatusUpdate;

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

exports.getUserSummaryCards = async (req, res) => {
  try {
    const [totalUsers, totalMothers, totalBabysitters, totalPendingReviews, totalRejected, totalBookings, totalPayments, successfulPayments, pendingPayoutRequests] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'Mother' }),
      User.countDocuments({ role: 'Babysitter' }),
      User.countDocuments({ status: 'pendingReview' }),
      User.countDocuments({ status: 'Rejected' }),
      Booking.countDocuments(),
      Payment.countDocuments(),
      Payment.aggregate([
        { $match: { status: 'succeeded' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Booking.countDocuments({ payoutStatus: 'requested' }),
    ]);

    const paymentSummary = successfulPayments?.[0] || { total: 0, count: 0 };

    return res.status(200).json({
      totalUsers,
      totalMothers,
      totalBabysitters,
      totalPendingReviews,
      totalRejected,
      totalBookings,
      totalPayments,
      successfulPaymentAmount: paymentSummary.total || 0,
      successfulPaymentCount: paymentSummary.count || 0,
      pendingPayoutRequests,
    });
  } catch (error) {
    console.error('getUserSummaryCards error:', error);
    return res.status(500).json({ message: 'Error fetching user summary cards.', error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const search = String(req.query.search || '').trim();
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
      const statuses = String(req.query.status)
        .split(',')
        .map((status) => status.trim())
        .filter(Boolean);
      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }

    if (search) {
      filter.$or = [
        { FirstName: { $regex: search, $options: 'i' } },
        { LastName: { $regex: search, $options: 'i' } },
        { Email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-Password -resetPasswordToken -resetPasswordExpires -pushTokens -stripeAccountId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      count: users.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      users: users.map(safeUser),
    });
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

exports.approveBabysitterRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const { action } = payload;
    if (action && String(action).toLowerCase() === 'approve') {
      // accepted as an alias for the dedicated approval endpoint
    }
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'Babysitter not found.' });
    }

    if (user.role !== 'Babysitter') {
      return res.status(400).json({ message: 'Only babysitter accounts can be approved from this endpoint.' });
    }

    if (user.status === 'Active') {
      return res.status(409).json({ message: 'This babysitter request is already approved.' });
    }

    if (user.status !== 'pendingReview') {
      return res.status(400).json({ message: 'Only babysitter applications in pendingReview can be approved.' });
    }

    user.status = 'Active';
    await user.save();

    const html = approvalTemplate({ firstName: user.FirstName, role: user.role });
    const message = 'Your QuickWatch babysitter application has been approved and your account is now active.';
    const subject = 'Your QuickWatch babysitter account has been approved';

    await sendEmail(user.Email, subject, html, message);
    await notifyUser({
      userId: user._id,
      type: 'account.approved',
      title: subject,
      message,
      data: { userId: user._id.toString(), status: 'Active', action: 'view_account' },
    });

    return res.status(200).json({
      message: 'Babysitter request approved successfully.',
      user: safeUser(user),
    });
  } catch (error) {
    console.error('approveBabysitterRequest error:', error);
    return res.status(500).json({ message: 'Error approving babysitter request.', error: error.message });
  }
};

exports.rejectBabysitterRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const reason = typeof payload.reason === 'string' ? payload.reason : '';
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'Babysitter not found.' });
    }

    if (user.role !== 'Babysitter') {
      return res.status(400).json({ message: 'Only babysitter accounts can be rejected from this endpoint.' });
    }

    if (!String(reason).trim()) {
      return res.status(400).json({ message: 'reason is required when rejecting an application.' });
    }

    user.status = 'Rejected';
    await user.save();

    const subject = 'Your QuickWatch babysitter application was rejected';
    const message = `Your babysitter application was rejected. Reason: ${reason}`;
    const html = `<p>Hello ${user.FirstName},</p><p>${message}</p><p>Regards,<br />QuickWatch</p>`;

    await sendEmail(user.Email, subject, html, message);
    await notifyUser({
      userId: user._id,
      type: 'account.rejected',
      title: subject,
      message,
      data: { userId: user._id.toString(), status: 'Rejected', action: 'view_account' },
    });

    return res.status(200).json({
      message: 'Babysitter request rejected successfully.',
      user: safeUser(user),
    });
  } catch (error) {
    console.error('rejectBabysitterRequest error:', error);
    return res.status(500).json({ message: 'Error rejecting babysitter request.', error: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const payload = req.body || {};
    const { status: resolvedStatus, reason = '' } = resolveStatusUpdate(payload);
    const allowedStatuses = ['Active', 'Rejected', 'Suspended', 'pendingReview'];

    if (!resolvedStatus) {
      return res.status(400).json({
        message: 'Request body must include a status or action. Accepted values: Active, Rejected, Suspended, pendingReview, approve, reject, suspend, review.',
      });
    }

    if (!allowedStatuses.includes(resolvedStatus)) {
      return res.status(400).json({ message: `status must be one of: ${allowedStatuses.join(', ')}.` });
    }
    if (resolvedStatus === 'Rejected' && !String(reason).trim()) {
      return res.status(400).json({ message: 'reason is required when rejecting an account.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (resolvedStatus === 'pendingReview' && user.role !== 'Babysitter') {
      return res.status(400).json({ message: 'Only babysitter accounts can be pending review.' });
    }

    user.status = resolvedStatus;
    await user.save();

    const isApproval = resolvedStatus === 'Active';
    const subject = isApproval ? 'Your QuickWatch account has been approved' : `Your QuickWatch account is ${resolvedStatus}`;
    const message = isApproval
      ? 'Your QuickWatch account has been approved and is now active.'
      : resolvedStatus === 'Rejected'
        ? `Your babysitter application was rejected. Reason: ${reason}`
        : `Your QuickWatch account status is now ${resolvedStatus}.`;
    const html = isApproval
      ? approvalTemplate({ firstName: user.FirstName, role: user.role })
      : `<p>Hello ${user.FirstName},</p><p>${message}</p>${reason ? `<p>Reason: ${reason}</p>` : ''}<p>Regards,<br />QuickWatch</p>`;

    await sendEmail(user.Email, subject, html, message);
    await notifyUser({
      userId: user._id,
      type: isApproval ? 'account.approved' : `account.${resolvedStatus.toLowerCase()}`,
      title: subject,
      message,
      data: { userId: user._id.toString(), status: resolvedStatus, action: 'view_account' },
    });

    return res.status(200).json({ message: `User status updated to ${resolvedStatus}.`, user: safeUser(user) });
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
