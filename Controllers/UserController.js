const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../Models/Users');
const Booking = require('../Models/Booking');
const sendEmail = require('../Middleware/emailsender');
const {
  welcomeTemplate,
  approvalTemplate,
  suspensionTemplate,
  resetPasswordTemplate,
  emailVerificationTemplate,
} = require('../Middleware/emailTemplates');
const { notifyUser } = require('../Services/notificationService');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.Email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified !== false,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

const sanitizeUser = (user) => ({
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
  emailVerified: user.emailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const normalizeDate = (value) => {
  if (!value) return '';
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return '';
  return dateValue.toISOString().slice(0, 10);
};

const parseTime = (value) => {
  if (!value) return null;
  const time = String(value).trim().toUpperCase();
  const match = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  if (minutes > 59) return null;
  if (match[3] === 'PM' && hours < 12) hours += 12;
  if (match[3] === 'AM' && hours === 12) hours = 0;
  if (hours > 23) return null;
  return hours * 60 + minutes;
};

const overlaps = (firstStart, firstEnd, secondStart, secondEnd) => {
  if ([firstStart, firstEnd, secondStart, secondEnd].some((value) => value === null)) return true;
  return firstStart < secondEnd && secondStart < firstEnd;
};

const isAvailabilityBooking = (booking) => (
  !['cancelled', 'declined', 'refunded'].includes(booking.lifecycleStatus)
  && (
    booking.status === true
    || booking.confirm === true
    || ['requested', 'accepted', 'inProgress', 'completed'].includes(booking.lifecycleStatus)
    || ['pending', 'paid'].includes(booking.paymentStatus)
  )
);

const getAvailability = (bookings, requestedDate, requestedStart, requestedEnd) => {
  const activeBookings = bookings.filter(isAvailabilityBooking);
  const bookedSlots = activeBookings.map((booking) => ({
    bookingId: booking._id,
    date: normalizeDate(booking.selectedStartDate),
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.paymentStatus || (booking.confirm ? 'confirmed' : 'requested'),
  }));

  if (!requestedDate) {
    const now = new Date();
    const today = normalizeDate(now);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return {
      available: !activeBookings.some((booking) => (
        normalizeDate(booking.selectedStartDate) === today
        && overlaps(parseTime(booking.startTime), parseTime(booking.endTime), currentMinutes, currentMinutes + 1)
      )),
      bookedSlots,
    };
  }

  const matchingBookings = activeBookings.filter((booking) => (
    normalizeDate(booking.selectedStartDate) === requestedDate
    && overlaps(parseTime(booking.startTime), parseTime(booking.endTime), requestedStart, requestedEnd)
  ));

  return {
    available: matchingBookings.length === 0,
    bookedSlots,
  };
};

exports.registerUser = async (req, res) => {
  try {
    const {
      FirstName,
      LastName,
      Email,
      Password,
      Gender,
      Phone,
      zipCode,
      Address,
      hourlyRate,
      role,
    } = req.body;

    if (!FirstName || !LastName || !Email || !Password || !Gender || !Phone || !zipCode || !Address) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    const normalizedEmail = Email.trim().toLowerCase();
    const existingUser = await User.findOne({ Email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);
    const normalizedRole = role || 'Mother';
    if (normalizedRole === 'Babysitter' && (!Number.isFinite(Number(hourlyRate)) || Number(hourlyRate) <= 0)) {
      return res.status(400).json({ message: 'hourlyRate is required and must be greater than zero for babysitters.' });
    }
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const newUser = await User.create({
      FirstName: FirstName.trim(),
      LastName: LastName.trim(),
      Email: normalizedEmail,
      Password: hashedPassword,
      Gender: Gender.trim(),
      Phone: Phone.trim(),
      zipCode: zipCode.trim(),
      Address: Address.trim(),
      hourlyRate: normalizedRole === 'Babysitter' ? Number(hourlyRate) : null,
      role: normalizedRole,
      status: normalizedRole === 'Babysitter' ? 'pendingReview' : 'Active',
      emailVerified: false,
      emailVerificationToken: crypto.createHash('sha256').update(verificationToken).digest('hex'),
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
    });

    const message = normalizedRole === 'Babysitter'
      ? 'Babysitter application submitted successfully. Your account is pending admin review.'
      : 'User registered successfully.';

    const verificationLink = `${process.env.EMAIL_VERIFICATION_URL || `http://localhost:${process.env.PORT || 8000}/users/verify-email`}?token=${verificationToken}&email=${encodeURIComponent(newUser.Email)}`;
    await sendEmail(
      newUser.Email,
      'Verify your QuickWatch email address',
      emailVerificationTemplate({ firstName: newUser.FirstName, verificationLink }),
      `Verify your QuickWatch email address by opening this link: ${verificationLink}`
    );
    return res.status(201).json({
      message,
      requiresEmailVerification: true,
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    console.error('registerUser error:', error);
    return res.status(500).json({
      message: 'Error registering user.',
      error: error.message,
    });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { Email, Password } = req.body;

    if (!Email || !Password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = Email.trim().toLowerCase();
    const user = await User.findOne({ Email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isPasswordValid = await bcrypt.compare(Password, user.Password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.emailVerified === false) {
      return res.status(403).json({
        message: 'Please verify your email address before logging in.',
        requiresEmailVerification: true,
      });
    }

    return res.status(200).json({
      message: 'Login successful.',
      token: generateToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('loginUser error:', error);
    return res.status(500).json({
      message: 'Error logging in user.',
      error: error.message,
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).json({ message: 'Verification token and email are required.' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ Email: email.trim().toLowerCase() })
      .select('+emailVerificationToken +emailVerificationExpires');
    if (!user || user.emailVerified || user.emailVerificationToken !== tokenHash || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ message: 'This email verification link is invalid or expired.' });
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    const welcomeHtml = welcomeTemplate({
      firstName: user.FirstName,
      role: user.role,
      loginLink: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : 'http://localhost:3000/login',
    });
    await sendEmail(user.Email, 'Welcome to QuickWatch', welcomeHtml, 'Welcome to QuickWatch');
    notifyUser({
      userId: user._id,
      type: 'account.welcome',
      title: 'Welcome to QuickWatch',
      message: 'Your email has been verified. Welcome to QuickWatch.',
      data: { action: 'open_dashboard' },
    }).catch((error) => console.error('welcome notification error:', error.message));

    return res.status(200).json({ message: 'Email verified successfully. You can now log in.', emailVerified: true });
  } catch (error) {
    console.error('verifyEmail error:', error);
    return res.status(500).json({ message: 'Error verifying email.', error: error.message });
  }
};

exports.resendVerificationEmail = async (req, res) => {
  try {
    const normalizedEmail = String(req.body.Email || '').trim().toLowerCase();
    if (!normalizedEmail) return res.status(400).json({ message: 'Email is required.' });
    const user = await User.findOne({ Email: normalizedEmail }).select('+emailVerificationToken +emailVerificationExpires');
    if (!user || user.emailVerified) return res.status(200).json({ message: 'If the account requires verification, a new email has been sent.' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();
    const verificationLink = `${process.env.EMAIL_VERIFICATION_URL || `http://localhost:${process.env.PORT || 8000}/users/verify-email`}?token=${verificationToken}&email=${encodeURIComponent(user.Email)}`;
    await sendEmail(user.Email, 'Verify your QuickWatch email address', emailVerificationTemplate({ firstName: user.FirstName, verificationLink }), `Verify your email: ${verificationLink}`);
    return res.status(200).json({ message: 'If the account requires verification, a new email has been sent.' });
  } catch (error) {
    console.error('resendVerificationEmail error:', error);
    return res.status(500).json({ message: 'Error resending verification email.', error: error.message });
  }
};

exports.getBabysitters = async (req, res) => {
  try {
    const requestedDate = normalizeDate(req.query.date || req.query.selectedStartDate);
    const requestedStart = parseTime(req.query.startTime);
    const requestedEnd = parseTime(req.query.endTime);

    if ((req.query.date || req.query.selectedStartDate) && !requestedDate) {
      return res.status(400).json({ message: 'date must be a valid date.' });
    }
    if (req.query.startTime && requestedStart === null) {
      return res.status(400).json({ message: 'startTime must use a valid time such as 09:00 or 9:00 AM.' });
    }
    if (req.query.endTime && requestedEnd === null) {
      return res.status(400).json({ message: 'endTime must use a valid time such as 17:00 or 5:00 PM.' });
    }
    if (requestedStart !== null && requestedEnd !== null && requestedEnd <= requestedStart) {
      return res.status(400).json({ message: 'endTime must be later than startTime.' });
    }

    const filter = { role: 'Babysitter', status: 'Active' };
    if (req.query.city) filter.city = new RegExp(`^${String(req.query.city).trim()}$`, 'i');
    if (req.query.state) filter.state = new RegExp(`^${String(req.query.state).trim()}$`, 'i');

    const babysitters = await User.find(filter)
      .select('-Password -resetPasswordToken -resetPasswordExpires -pushTokens -stripeAccountId')
      .sort({ createdAt: -1 })
      .lean();
    const babysitterIds = babysitters.map((babysitter) => babysitter._id);
    const bookings = await Booking.find({ babysitter: { $in: babysitterIds } })
      .select('babysitter selectedStartDate startTime endTime status confirm paymentStatus')
      .lean();

    const bookingsByBabysitter = bookings.reduce((result, booking) => {
      const key = booking.babysitter.toString();
      if (!result[key]) result[key] = [];
      result[key].push(booking);
      return result;
    }, {});

    const results = babysitters.map((babysitter) => {
      const availability = getAvailability(
        bookingsByBabysitter[babysitter._id.toString()] || [],
        requestedDate,
        requestedStart,
        requestedEnd
      );

      return {
        ...babysitter,
        availability: availability.available ? 'available' : 'booked',
        available: availability.available,
        bookedSlots: availability.bookedSlots,
      };
    });

    return res.status(200).json({
      count: results.length,
      filters: {
        date: requestedDate || null,
        startTime: req.query.startTime || null,
        endTime: req.query.endTime || null,
        city: req.query.city || null,
        state: req.query.state || null,
      },
      babysitters: results,
    });
  } catch (error) {
    console.error('getBabysitters error:', error);
    return res.status(500).json({
      message: 'Error fetching babysitters.',
      error: error.message,
    });
  }
};

exports.getPendingBabysitters = async (req, res) => {
  try {
    const babysitters = await User.find({
      role: 'Babysitter',
      status: 'pendingReview'
    }).select('-Password -resetPasswordToken -resetPasswordExpires');

    return res.status(200).json({
      count: babysitters.length,
      babysitters,
    });
  } catch (error) {
    console.error('getPendingBabysitters error:', error);
    return res.status(500).json({
      message: 'Error fetching pending babysitters.',
      error: error.message,
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    if (!['Active', 'pendingReview', 'Rejected', 'Suspended'].includes(status)) {
      return res.status(400).json({
        message: 'Status must be one of: Active, pendingReview, Rejected, Suspended.',
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role !== 'Babysitter' && status === 'pendingReview') {
      return res.status(400).json({
        message: 'Only Babysitter accounts can be placed in pending review.',
      });
    }

    user.status = status;
    await user.save();

    if (status === 'Active') {
      const htmlTemplate = approvalTemplate({
        firstName: user.FirstName,
        role: user.role,
      });
      await sendEmail(user.Email, 'Your QuickWatch account has been approved', htmlTemplate, 'Your account has been approved');
      notifyUser({
        userId: user._id,
        type: 'account.approved',
        title: 'Account approved',
        message: 'Your QuickWatch account has been approved.',
        data: { action: 'open_dashboard' },
      }).catch((error) => console.error('approval notification error:', error.message));
    }

    if (status === 'Suspended') {
      const htmlTemplate = suspensionTemplate({
        firstName: user.FirstName,
        reason: 'Your account violates our policies or has been suspended by an administrator.',
      });
      await sendEmail(user.Email, 'Your QuickWatch account has been suspended', htmlTemplate, 'Your account has been suspended');
      notifyUser({
        userId: user._id,
        type: 'account.suspended',
        title: 'Account suspended',
        message: 'Your QuickWatch account has been suspended. Please contact support.',
        data: { action: 'contact_support' },
      }).catch((error) => console.error('suspension notification error:', error.message));
    }

    return res.status(200).json({
      message: `User status updated to ${status}.`,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('updateUserStatus error:', error);
    return res.status(500).json({
      message: 'Error updating user status.',
      error: error.message,
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { Email } = req.body;

    if (!Email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const normalizedEmail = Email.trim().toLowerCase();
    const user = await User.findOne({ Email: normalizedEmail });

    if (!user) {
      return res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${normalizedEmail}`;

    const resetHtml = resetPasswordTemplate({ resetLink });
    await sendEmail(
      normalizedEmail,
      'Password Reset Request',
      resetHtml,
      `You requested a password reset. Use the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour.`
    );

    return res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('forgotPassword error:', error);
    return res.status(500).json({
      message: 'Error processing password reset request.',
      error: error.message,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { Email, Token, Password } = req.body;

    if (!Email || !Token || !Password) {
      return res.status(400).json({ message: 'Email, token and new password are required.' });
    }

    if (Password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = Email.trim().toLowerCase();
    const user = await User.findOne({ Email: normalizedEmail });

    if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    if (Date.now() > new Date(user.resetPasswordExpires).getTime()) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    const isValidToken = await bcrypt.compare(Token, user.resetPasswordToken);

    if (!isValidToken) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    user.Password = await bcrypt.hash(Password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ message: 'Password reset successful.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    return res.status(500).json({
      message: 'Error resetting password.',
      error: error.message,
    });
  }
};
