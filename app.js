const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { setIo, addSocket, removeSocket } = require('./Services/chatPresence');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
setIo(io);

const dotenv = require('dotenv');
dotenv.config(); // Load environment variables from .env file

const userRoute = require('./Routes/UserRoute');
const bookingRoute = require('./Routes/BookingRoute');
const chatRoute = require('./Routes/ChatRoute');
const paymentRoute = require('./Routes/PaymentRoute');
const notificationRoute = require('./Routes/NotificationRoute');
const adminRoute = require('./Routes/AdminRoute');
const reviewRoute = require('./Routes/ReviewRoute');
const kycRoute = require('./Routes/KycRoute');
const settingsRoute = require('./Routes/SettingsRoute');
const { handleStripeWebhook } = require('./Controllers/PaymentController');
const Booking = require('./Models/Booking');

app.post('/payments/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use(express.json()); //middleware to parse JSON request bodies
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/users', userRoute); //use the user route for all requests starting with /users
app.use('/bookings', bookingRoute);
app.use('/chats', chatRoute);
app.use('/payments', paymentRoute);
app.use('/notifications', notificationRoute);
app.use('/admin', adminRoute);
app.use('/reviews', reviewRoute);
app.use('/kyc', kycRoute);
app.use('/settings', settingsRoute);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
    || socket.handshake.headers.authorization?.split(' ')[1];
  if (!token) return next(new Error('Authentication required'));

  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return next(new Error('Invalid authentication token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  addSocket(userId, socket.id);
  socket.join(`user:${userId}`);
  console.log('User connected:', socket.id, 'as', userId);

  socket.on('joinBookingRoom', async (bookingId, callback) => {
    try {
      const booking = await Booking.findOne({
        _id: bookingId,
        $or: [{ mother: userId }, { babysitter: userId }],
      }).select('_id');
      if (!booking) {
        if (typeof callback === 'function') callback({ ok: false, message: 'Not a booking participant.' });
        return;
      }
      socket.join(bookingId);
      if (typeof callback === 'function') callback({ ok: true });
      console.log(`Socket ${socket.id} joined booking room: ${bookingId}`);
    } catch (error) {
      if (typeof callback === 'function') callback({ ok: false, message: 'Unable to join booking room.' });
    }
  });

  socket.on('sendBookingMessage', (data) => {
    const { bookingId, message, receiverId } = data;
    if (!socket.rooms.has(bookingId) || !message || !receiverId) return;
    io.to(bookingId).emit('receiveBookingMessage', {
      bookingId,
      message,
      senderId: userId,
      receiverId,
      createdAt: new Date(),
    });
  });

  socket.on('disconnect', () => {
    removeSocket(userId, socket.id);
    console.log('User disconnected:', socket.id);
  });
});

const connectDB = require('./Config/databaseConfig');
connectDB(); // Connect to MongoDB

server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});

