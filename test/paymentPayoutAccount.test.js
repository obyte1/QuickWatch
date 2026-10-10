const test = require('node:test');
const assert = require('node:assert/strict');

process.env.STRIPE_SECRET_KEY = 'sk_test_replace_me';
const { createPayoutAccount } = require('../Controllers/PaymentController');

test('payout account setup reports placeholder Stripe credentials clearly', async () => {
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
    user: { id: 'user-id', role: 'Babysitter' },
    body: {},
  }, res);

  assert.equal(statusCode, 503);
  assert.match(responseBody.message, /replace the STRIPE_SECRET_KEY placeholder/i);
});
