const fs = require('fs');
const path = require('path');

const templateDirectory = path.join(__dirname, '../EmailTemplates');

const readTemplate = (fileName) => {
  return fs.readFileSync(path.join(templateDirectory, fileName), 'utf8');
};

const applyTemplate = (template, values = {}) => {
  return Object.entries(values).reduce((content, [key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    return content.replace(regex, value ?? '');
  }, template);
};

const welcomeTemplate = ({ firstName, role, loginLink = 'http://localhost:3000/login' }) => {
  return applyTemplate(readTemplate('welcome.html'), {
    FirstName: firstName,
    Role: role,
    LoginLink: loginLink,
  });
};

const bookingTemplate = ({ firstName, babysitterName, date, time, location }) => {
  return applyTemplate(readTemplate('booking.html'), {
    FirstName: firstName,
    BabysitterName: babysitterName,
    BookingDate: date,
    BookingTime: time,
    Location: location,
  });
};

const paymentTemplate = ({ firstName, amount, currency, bookingId }) => {
  return applyTemplate(readTemplate('payment.html'), {
    FirstName: firstName,
    Amount: amount,
    Currency: currency,
    BookingId: bookingId,
  });
};

const approvalTemplate = ({ firstName, role }) => {
  return applyTemplate(readTemplate('approval.html'), {
    FirstName: firstName,
    Role: role,
  });
};

const suspensionTemplate = ({ firstName, reason }) => {
  return applyTemplate(readTemplate('suspension.html'), {
    FirstName: firstName,
    Reason: reason,
  });
};

const resetPasswordTemplate = ({ resetLink }) => {
  return applyTemplate(readTemplate('resetPassword.html'), {
    ResetLink: resetLink,
  });
};

const emailVerificationTemplate = ({ firstName, verificationLink }) => {
  return applyTemplate(readTemplate('emailVerification.html'), {
    FirstName: firstName,
    VerificationLink: verificationLink,
  });
};

module.exports = {
  welcomeTemplate,
  bookingTemplate,
  paymentTemplate,
  approvalTemplate,
  suspensionTemplate,
  resetPasswordTemplate,
  emailVerificationTemplate,
};
