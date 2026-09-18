const Booking = require('../Models/Booking');
const Chat = require('../Models/Chat');
const User = require('../Models/Users');
const { notifyUser } = require('../Services/notificationService');
const sendEmail = require('../Middleware/emailsender');
const { emitToUser, isOnline } = require('../Services/chatPresence');

exports.sendMessage = async (req, res) => {
  try {
    const { bookingId, receiverId, chat } = req.body;
    const senderId = req.user?.id || req.user?._id;

    if (!bookingId || !receiverId || !chat) {
      return res.status(400).json({
        message: 'bookingId, receiverId and chat message are required.',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const isParticipant =
      booking.mother?.toString() === senderId || booking.babysitter?.toString() === senderId;

    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not part of this booking chat.' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found.' });
    }

    const message = await Chat.create({
      booking: bookingId,
      sender: senderId,
      receiver: receiverId,
      senderEmail: req.user?.email || '',
      receiverEmail: receiver.Email,
      chat,
    });

    const liveMessage = {
      _id: message._id,
      bookingId,
      senderId,
      receiverId,
      chat,
      createdAt: message.createdAt,
    };
    const deliveredLive = emitToUser(receiverId, 'chat:message', liveMessage);

    if (!deliveredLive && receiver.Email) {
      await sendEmail(
        receiver.Email,
        'You have a new QuickWatch chat message',
        `<p>You received a new message about booking <strong>${bookingId}</strong>.</p><p>${chat}</p><p>Log in to reply.</p>`,
        `You received a new message about booking ${bookingId}:\n\n${chat}`
      );
    }

    notifyUser({
      userId: receiverId,
      type: 'chat.message',
      title: 'New chat message',
      message: 'You have a new message about a booking.',
      data: { bookingId, messageId: message._id.toString(), action: 'open_chat' },
    }).catch((error) => console.error('chat notification error:', error.message));

    return res.status(201).json({
      message: 'Chat message sent successfully.',
      data: message,
      delivery: deliveredLive ? 'live' : 'email',
    });
  } catch (error) {
    console.error('sendMessage error:', error);
    return res.status(500).json({
      message: 'Error sending message.',
      error: error.message,
    });
  }
};

exports.getBookingMessages = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.id || req.user?._id;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const isParticipant =
      booking.mother?.toString() === userId || booking.babysitter?.toString() === userId;
    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not part of this booking chat.' });
    }

    const messages = await Chat.find({ booking: bookingId })
      .sort({ createdAt: 1 })
      .populate('sender', 'FirstName LastName Email')
      .populate('receiver', 'FirstName LastName Email');

    return res.status(200).json({ messages });
  } catch (error) {
    console.error('getBookingMessages error:', error);
    return res.status(500).json({
      message: 'Error fetching messages.',
      error: error.message,
    });
  }
};

exports.getAdminBookingChat = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('mother', 'FirstName LastName Email Phone picture')
      .populate('babysitter', 'FirstName LastName Email Phone picture hourlyRate status');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const messages = await Chat.find({ booking: booking._id })
      .sort({ createdAt: 1 })
      .populate('sender', 'FirstName LastName Email role')
      .populate('receiver', 'FirstName LastName Email role');

    return res.status(200).json({
      booking,
      participants: {
        mother: booking.mother,
        babysitter: booking.babysitter,
      },
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error('getAdminBookingChat error:', error);
    return res.status(500).json({ message: 'Error fetching booking chat.', error: error.message });
  }
};
