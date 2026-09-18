const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Try again later.' },
});

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many password reset attempts. Try again later.' },
});

const requireFields = (fields) => (req, res, next) => {
  const missing = fields.filter((field) => (
    req.body[field] === undefined || req.body[field] === null || String(req.body[field]).trim() === ''
  ));
  if (missing.length) {
    return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}.` });
  }
  next();
};

const validateRegistration = requireFields([
  'FirstName', 'LastName', 'Email', 'Password', 'Gender', 'Phone', 'zipCode', 'Address',
]);
const validateLogin = requireFields(['Email', 'Password']);
const validateBooking = requireFields(['selectedStartDate', 'startTime', 'endTime', 'location']);

module.exports = {
  authLimiter,
  passwordLimiter,
  validateRegistration,
  validateLogin,
  validateBooking,
};
