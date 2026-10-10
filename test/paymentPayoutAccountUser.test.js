const test = require('node:test');
const assert = require('node:assert/strict');

process.env.STRIPE_SECRET_KEY = 'sk_test_quickwatch_test_key';
const User = require('../Models/Users');
User.findById = async () => null;

const { createPayoutAccount } = require('../Controllers/PaymentController');

test('payout account setup returns 404 when the authenticated user no longer exists', async () => {
  let statusCode;
  let responseBody;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  await createPayoutAccount({
    user: { id: 'deleted-user-id', role: 'Babysitter' },
    body: {},
  }, res);

  assert.equal(statusCode, 404);
  assert.deepEqual(responseBody, { message: 'User not found.' });
});
