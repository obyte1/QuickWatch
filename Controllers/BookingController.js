const Booking = require('../Models/Booking');
const User = require('../Models/Users');
const sendEmail = require('../Middleware/emailsender');
const { bookingTemplate } = require('../Middleware/emailTemplates');
const { notifyUser } = require('../Services/notificationService');
const { normalizeDate, parseTime, isBlockingBooking, bookingsOverlap } = require('../Utility/bookingAvailability');
const CompanySettings = require('../Models/CompanySettings');

const getUserId = (req) => req.user?.id || req.user?._id;
const getHours = (startTime, endTime) => (parseTime(endTime) - parseTime(startTime)) / 60;

exports.createBooking = async (req, res) => {
  try {
    const {
      selectedStartDate,
      startTime,
      endTime,
      watcherRole,
      motherName,
      childNo,
      childOption2,
      rateHour,
      requestedAmount,
      amount,
      childrenDescription,
      specialInstructions,
      email,
      emailTo,
      location,
      address,
      zipcode,
      picture,
      picture2,
      watcherName,
      babysitterId,
    } = req.body;

    if (!selectedStartDate || !startTime || !endTime || !location) {
      return res.status(400).json({
        message: 'selectedStartDate, startTime, endTime and location are required.',
      });
    }

    if (!normalizeDate(selectedStartDate) || parseTime(startTime) === null || parseTime(endTime) === null) {
      return res.status(400).json({ message: 'A valid selectedStartDate, startTime and endTime are required.' });
    }
    if (parseTime(endTime) <= parseTime(startTime)) {
      return res.status(400).json({ message: 'endTime must be later than startTime.' });
    }
    const proposedAmount = Number(requestedAmount ?? amount);
    if (!Number.isFinite(proposedAmount) || proposedAmount <= 0) {
      return res.status(400).json({ message: 'requestedAmount is required and must be greater than zero.' });
    }

    const babysitter = babysitterId ? await User.findById(babysitterId) : null;
    if (babysitterId && (!babysitter || babysitter.role !== 'Babysitter' || babysitter.status !== 'Active')) {
      return res.status(404).json({ message: 'Valid babysitter not found.' });
    }

    const motherId = req.user?.id || req.user?._id;
    const requestedSlot = { selectedStartDate, startTime, endTime };
    if (babysitter) {
      const existingBookings = await Booking.find({
        babysitter: babysitter._id,
        selectedStartDate: { $exists: true },
      }).select('selectedStartDate startTime endTime status confirm lifecycleStatus paymentStatus');
      const hasConflict = existingBookings.some((booking) => (
        isBlockingBooking(booking) && bookingsOverlap(booking, requestedSlot)
      ));
      if (hasConflict) {
        return res.status(409).json({ message: 'This babysitter is already booked for the selected time.' });
      }
    }

    const booking = await Booking.create({
      selectedStartDate,
      startTime,
      endTime,
      watcherRole: watcherRole || 'Babysitter',
      motherName: motherName || req.user?.name || '',
      childNo: childNo || 0,
      childOption2: childOption2 || '',
      rateHour: rateHour || '',
      requestedAmount: proposedAmount,
      childrenDescription: childrenDescription || childOption2 || '',
      specialInstructions: specialInstructions || '',
      email: email || req.user?.email || '',
      emailTo: emailTo || babysitter?.Email || '',
      location,
      address: address || '',
      zipcode: zipcode || '',
      picture: picture || '',
      picture2: picture2 || '',
      watcherName: watcherName || (babysitter ? `${babysitter.FirstName} ${babysitter.LastName}` : ''),
      mother: motherId,
      babysitter: babysitter?._id || null,
      status: false,
      confirm: false,
      lifecycleStatus: 'requested',
    });

    const requestMotherName = booking.motherName || req.user?.name || 'Mother';
    if (babysitter) {
      notifyUser({
        userId: babysitter._id,
        type: 'booking.created',
        title: 'New booking request',
        message: `${requestMotherName} sent you a new babysitting booking request.`,
        data: { bookingId: booking._id.toString(), action: 'view_booking' },
      }).catch((error) => console.error('booking notification error:', error.message));
    }
    notifyUser({
      userId: motherId,
      type: 'booking.created',
      title: 'Booking request created',
      message: 'Your babysitting booking request was created successfully.',
      data: { bookingId: booking._id.toString(), action: 'view_booking' },
    }).catch((error) => console.error('booking notification error:', error.message));

    const bookingHtml = bookingTemplate({
      firstName: requestMotherName,
      babysitterName: babysitter ? `${babysitter.FirstName} ${babysitter.LastName}` : 'Available babysitter request',
      date: booking.selectedStartDate,
      time: `${booking.startTime} - ${booking.endTime}`,
      location: booking.location,
    });

    await sendEmail(
      booking.email || req.user?.email || babysitter?.Email,
      'Booking Request Created',
      bookingHtml,
      `Your booking request for ${booking.selectedStartDate} has been created.`
    );

    if (babysitter?.Email) {
      await sendEmail(
        babysitter.Email,
        'New Booking Request',
        bookingTemplate({
          firstName: babysitter.FirstName,
          babysitterName: requestMotherName,
          date: booking.selectedStartDate,
          time: `${booking.startTime} - ${booking.endTime}`,
          location: booking.location,
        }),
        `New booking request from ${requestMotherName}.`
      );
    }

    return res.status(201).json({
      message: 'Booking request created successfully.',
      booking,
    });
  } catch (error) {
    console.error('createBooking error:', error);
    return res.status(500).json({
      message: 'Error creating booking request.',
      error: error.message,
    });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const bookings = await Booking.find({
      $or: [{ mother: userId }, { babysitter: userId }],
    })
        .populate('mother', 'FirstName LastName Email picture ratingAverage ratingCount')
        .populate('babysitter', 'FirstName LastName Email status picture hourlyRate ratingAverage ratingCount');

    return res.status(200).json({ bookings });
  } catch (error) {
    console.error('getMyBookings error:', error);
    return res.status(500).json({
      message: 'Error fetching bookings.',
      error: error.message,
    });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, confirm, lifecycleStatus } = req.body;
    const userId = req.user?.id || req.user?._id;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const isMother = booking.mother?.toString() === userId.toString();
    const isBabysitter = booking.babysitter?.toString() === userId.toString();
    if (!isMother && !isBabysitter) {
      return res.status(403).json({ message: 'You are not a participant in this booking.' });
    }

    if (lifecycleStatus) {
      const allowedForBabysitter = ['accepted', 'declined', 'inProgress', 'completed'];
      const allowedForMother = ['cancelled', 'completed'];
      const allowed = isBabysitter ? allowedForBabysitter : allowedForMother;
      if (!allowed.includes(lifecycleStatus)) {
        return res.status(403).json({ message: 'You are not allowed to set this booking status.' });
      }
      if (['cancelled', 'declined'].includes(booking.lifecycleStatus)) {
        return res.status(409).json({ message: 'This booking is already closed.' });
      }
      booking.lifecycleStatus = lifecycleStatus;
      if (lifecycleStatus === 'accepted') booking.status = true;
      if (lifecycleStatus === 'completed') booking.confirm = true;
      if (lifecycleStatus === 'cancelled' || lifecycleStatus === 'declined') {
        booking.cancelledBy = userId;
        booking.cancelledAt = new Date();
        booking.cancellationReason = req.body.reason || '';
      }
    }

    if (typeof status !== 'undefined' && !lifecycleStatus) booking.status = Boolean(status);
    if (typeof confirm !== 'undefined') booking.confirm = Boolean(confirm);

    await booking.save();

    notifyUser({
      userId: booking.mother,
      type: 'booking.updated',
      title: 'Booking updated',
      message: 'Your booking status has been updated.',
      data: { bookingId: booking._id.toString(), status: booking.status, confirm: booking.confirm, action: 'view_booking' },
    }).catch((error) => console.error('booking notification error:', error.message));
    notifyUser({
      userId: booking.babysitter,
      type: 'booking.updated',
      title: 'Booking updated',
      message: 'A booking status has been updated.',
      data: { bookingId: booking._id.toString(), status: booking.status, confirm: booking.confirm, action: 'view_booking' },
    }).catch((error) => console.error('booking notification error:', error.message));

    return res.status(200).json({
      message: 'Booking updated successfully.',
      booking,
    });
  } catch (error) {
    console.error('updateBookingStatus error:', error);
    return res.status(500).json({
      message: 'Error updating booking.',
      error: error.message,
    });
  }
};

exports.cancelBooking = async (req, res) => {
  req.body.lifecycleStatus = 'cancelled';
  return exports.updateBookingStatus(req, res);
};

exports.getBabysitterRequests = async (req, res) => {
  try {
  const requests = await Booking.find({
    lifecycleStatus: 'requested',
    $or: [{ babysitter: getUserId(req) }, { babysitter: null }],
  }).populate('mother', 'FirstName LastName city state picture').sort({ createdAt: -1 });
  return res.status(200).json({ count: requests.length, requests });
  } catch (error) {
  console.error('getBabysitterRequests error:', error);
  return res.status(500).json({ message: 'Error fetching booking requests.', error: error.message });
  }
};

exports.updateBookingDetails = async (req, res) => {
  try {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found.' });
  if (booking.mother?.toString() !== getUserId(req).toString()) {
    return res.status(403).json({ message: 'Only the mother can modify this booking.' });
  }
  if (booking.lifecycleStatus !== 'requested') {
    return res.status(409).json({ message: 'Booking details can only be modified before sitter acceptance.' });
  }

  const fields = ['selectedStartDate', 'startTime', 'endTime', 'location', 'address', 'zipcode', 'childNo', 'childrenDescription', 'specialInstructions'];
  for (const field of fields) {
    if (typeof req.body[field] !== 'undefined') booking[field] = req.body[field];
  }
  if (typeof req.body.requestedAmount !== 'undefined' || typeof req.body.amount !== 'undefined') {
    const proposedAmount = Number(req.body.requestedAmount ?? req.body.amount);
    if (!Number.isFinite(proposedAmount) || proposedAmount <= 0) return res.status(400).json({ message: 'requestedAmount must be greater than zero.' });
    booking.requestedAmount = proposedAmount;
  }
  if (parseTime(booking.endTime) <= parseTime(booking.startTime)) return res.status(400).json({ message: 'endTime must be later than startTime.' });
  await booking.save();
  return res.status(200).json({ message: 'Booking details updated.', booking });
  } catch (error) {
  console.error('updateBookingDetails error:', error);
  return res.status(500).json({ message: 'Error updating booking details.', error: error.message });
  }
};

exports.acceptBooking = async (req, res) => {
  try {
  const booking = await Booking.findOne({
    _id: req.params.id,
    lifecycleStatus: 'requested',
    $or: [{ babysitter: getUserId(req) }, { babysitter: null }],
  });
  if (!booking) return res.status(404).json({ message: 'Booking request not found.' });
  if (req.user.role !== 'Babysitter') return res.status(403).json({ message: 'Only babysitters can accept booking requests.' });

  const conflict = await Booking.findOne({
    _id: { $ne: booking._id },
    babysitter: booking.babysitter,
    selectedStartDate: booking.selectedStartDate,
    lifecycleStatus: { $in: ['accepted', 'inProgress', 'completed'] },
  });
  if (conflict && bookingsOverlap(conflict, booking)) return res.status(409).json({ message: 'You already have a booking at this time.' });

  const sitter = await User.findById(getUserId(req));
  if (!sitter || sitter.status !== 'Active' || !Number(sitter.hourlyRate)) {
    return res.status(403).json({ message: 'An active babysitter with an hourly rate is required.' });
  }
  const settings = await CompanySettings.findOne({ key: 'default' }).lean();
  const companyFeePerHour = Number(settings?.extraAmountPerHour || 0);
  const hours = getHours(booking.startTime, booking.endTime);
  const serviceAmount = booking.requestedAmount || (Number(sitter.hourlyRate) * hours);
  const companyFee = companyFeePerHour * hours;
  booking.sitterHourlyRate = Number(sitter.hourlyRate || 0);
  booking.babysitter = sitter._id;
  booking.companyFeePerHour = companyFeePerHour;
  booking.serviceAmount = serviceAmount;
  booking.companyFee = companyFee;
  booking.totalAmount = serviceAmount + companyFee;
  booking.lifecycleStatus = 'accepted';
  booking.status = true;
  booking.acceptedAt = new Date();
  await booking.save();

  notifyUser({ userId: booking.mother, type: 'booking.accepted', title: 'Booking accepted', message: 'The babysitter accepted your request. Complete payment to confirm it.', data: { bookingId: booking._id.toString(), action: 'pay_booking' } }).catch((error) => console.error('booking notification error:', error.message));
  return res.status(200).json({ message: 'Booking accepted. Mother can now pay the total amount.', booking, paymentSummary: { serviceAmount, companyFee, totalAmount: booking.totalAmount, currency: settings?.currency || 'usd' } });
  } catch (error) {
  console.error('acceptBooking error:', error);
  return res.status(500).json({ message: 'Error accepting booking.', error: error.message });
  }
};
