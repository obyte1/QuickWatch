const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  firstName: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    default: ''
  },
  address1: {
    type: String,
    default: ''
  },
  address2: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  zipCode: {
    type: String,
    default: ''
  },
  mobile: {
    type: String,
    default: ''
  },
  cardNumber: {
    type: String,
    default: ''
  },
  expirationDate: {
    type: String,
    default: ''
  },
  cvv: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;
