const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  chat: {
    type: String,
    required: true
  },
  senderEmail: {
    type: String,
    required: true,
    default: ''
  },
  receiverEmail: {
    type: String,
    required: true,
    default: ''
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
