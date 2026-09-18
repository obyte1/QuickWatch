const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    unique: true,
    default: 'default'
  },
  extraAmountPerHour: {
    type: Number,
    min: 0,
    default: 0
  },
  currency: {
    type: String,
    default: 'usd'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('CompanySettings', companySettingsSchema);