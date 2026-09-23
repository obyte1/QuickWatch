require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../Models/Users');
const Booking = require('../Models/Booking');
const Chat = require('../Models/Chat');
const Payment = require('../Models/Payment');

const motherEmail = 'mother.demo@example.com';
const babysitterEmail = 'babysitter.demo@example.com';

const ensureUser = async ({
  email,
  firstName,
  lastName,
  role,
  password = 'Password123!',
  gender = 'Female',
  phone = '08030000000',
  zipCode = '10001',
  address = '123 Demo Street, Lekki',
  hourlyRate = null,
  status = 'Active',
}) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  let user = await User.findOne({ Email: normalizedEmail }).lean();

  if (!user) {
    user = await User.create({
      FirstName: firstName,
      LastName: lastName,
      Email: normalizedEmail,
      Password: password,
      Gender: gender,
      Phone: phone,
      zipCode,
      Address: address,
      hourlyRate,
      role,
      roles: [role],
      status,
      emailVerified: true,
    });
  } else {
    user = await User.findById(user._id);
    user.role = role;
    user.roles = [role];
    user.status = status;
    user.hourlyRate = hourlyRate;
    await user.save();
  }

  return user;
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined in your .env file.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const mother = await ensureUser({
    email: motherEmail,
    firstName: 'Mary',
    lastName: 'Johnson',
    role: 'Mother',
    gender: 'Female',
    phone: '08030000001',
    zipCode: '10001',
    address: '12 Ikoyi Road, Lagos',
    status: 'Active',
  });

  const babysitter = await ensureUser({
    email: babysitterEmail,
    firstName: 'Grace',
    lastName: 'Smith',
    role: 'Babysitter',
    gender: 'Female',
    phone: '08030000002',
    zipCode: '10001',
    address: '4 Victoria Island, Lagos',
    hourlyRate: 2500,
    status: 'Active',
  });

  const selectedDate = '2026-10-02';

  let booking = await Booking.findOne({
    mother: mother._id,
    babysitter: babysitter._id,
    selectedStartDate: selectedDate,
  });

  if (!booking) {
    booking = await Booking.create({
      selectedStartDate: selectedDate,
      startTime: '09:00',
      endTime: '13:00',
      watcherRole: 'Babysitter',
      motherName: `${mother.FirstName} ${mother.LastName}`,
      childNo: 2,
      childOption2: 'Toddler and newborn',
      rateHour: '2500',
      requestedAmount: 12000,
      companyFeePerHour: 500,
      sitterHourlyRate: 2500,
      serviceAmount: 10000,
      companyFee: 2000,
      totalAmount: 12000,
      childrenDescription: '2 children; one toddler and one infant',
      specialInstructions: 'Please bring snacks and diapers.',
      email: mother.Email,
      emailTo: babysitter.Email,
      location: 'Lekki',
      address: '12 Ikoyi Road, Lagos',
      zipcode: '10001',
      picture: '',
      picture2: '',
      watcherName: `${babysitter.FirstName} ${babysitter.LastName}`,
      status: true,
      confirm: true,
      lifecycleStatus: 'accepted',
      paymentStatus: 'pending',
      mother: mother._id,
      babysitter: babysitter._id,
      acceptedAt: new Date(),
    });
  }

  const chat = await Chat.findOne({ booking: booking._id, sender: mother._id, receiver: babysitter._id })
    || await Chat.create({
      chat: 'Hi, I would love to confirm the babysitting request for Friday morning.',
      senderEmail: mother.Email,
      receiverEmail: babysitter.Email,
      booking: booking._id,
      sender: mother._id,
      receiver: babysitter._id,
    });

  const payment = await Payment.findOne({ booking: booking._id, user: mother._id })
    || await Payment.create({
      amount: booking.totalAmount || booking.requestedAmount || 12000,
      currency: 'usd',
      stripePaymentId: 'seed_payment_' + Date.now(),
      paymentIntentId: 'seed_pi_' + Date.now(),
      status: 'succeeded',
      userEmail: mother.Email,
      user: mother._id,
      booking: booking._id,
      payoutStatus: 'not_requested',
    });

  console.log('Seed data inserted successfully.');
  console.log(JSON.stringify({
    mother: {
      _id: mother._id.toString(),
      Email: mother.Email,
      role: mother.role,
      status: mother.status,
    },
    babysitter: {
      _id: babysitter._id.toString(),
      Email: babysitter.Email,
      role: babysitter.role,
      status: babysitter.status,
    },
    booking: {
      _id: booking._id.toString(),
      lifecycleStatus: booking.lifecycleStatus,
      totalAmount: booking.totalAmount,
    },
    chat: {
      _id: chat._id.toString(),
      booking: chat.booking.toString(),
    },
    payment: {
      _id: payment._id.toString(),
      booking: payment.booking.toString(),
      status: payment.status,
    },
  }, null, 2));

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Seed error:', error);
  process.exit(1);
});
