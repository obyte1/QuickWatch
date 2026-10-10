const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRoles, getPrimaryRole } = require('../Models/Users');

test('normalizeRoles accepts single and multi-role input', () => {
  assert.deepEqual(normalizeRoles('Mother'), ['Mother']);
  assert.deepEqual(normalizeRoles(['Mother', 'Babysitter']), ['Mother', 'Babysitter']);
  assert.deepEqual(normalizeRoles(['mother', 'babysitter']), ['Mother', 'Babysitter']);
});

test('getPrimaryRole keeps the first active role', () => {
  assert.equal(getPrimaryRole(['Mother', 'Babysitter']), 'Mother');
  assert.equal(getPrimaryRole('Babysitter'), 'Babysitter');
});

test('User validation preserves the selected role when the account has multiple roles', async () => {
  const User = require('../Models/Users');
  const user = new User({
    FirstName: 'Taylor',
    LastName: 'Example',
    Email: 'taylor@example.com',
    Password: 'hashed-password',
    Gender: 'Other',
    Phone: '555-0100',
    zipCode: '10001',
    Address: '1 Main Street',
    roles: ['Mother', 'Babysitter'],
    role: 'Mother',
  });

  user.role = 'Babysitter';
  await user.validate();

  assert.deepEqual(user.roles, ['Mother', 'Babysitter']);
  assert.equal(user.role, 'Babysitter');
});

test('switchDashboardRole returns the selected role after saving', async () => {
  const User = require('../Models/Users');
  const { switchDashboardRole } = require('../Controllers/UserController');
  const originalFindById = User.findById;
  const originalJwtSecret = process.env.JWT_SECRET;
  const user = new User({
    FirstName: 'Taylor',
    LastName: 'Example',
    Email: 'taylor@example.com',
    Password: 'hashed-password',
    Gender: 'Other',
    Phone: '555-0100',
    zipCode: '10001',
    Address: '1 Main Street',
    roles: ['Mother', 'Babysitter'],
    role: 'Mother',
  });
  user.save = async function() {
    await this.validate();
  };
  User.findById = async () => user;
  process.env.JWT_SECRET = 'test-secret';

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

  try {
    await switchDashboardRole({
      body: { role: 'Babysitter' },
      user: { id: user._id.toString() },
    }, res);

    assert.equal(statusCode, 200);
    assert.equal(responseBody.message, 'Dashboard switched to Babysitter.');
    assert.equal(responseBody.user.role, 'Babysitter');
    assert.equal(require('jsonwebtoken').verify(responseBody.token, process.env.JWT_SECRET).role, 'Babysitter');
  } finally {
    User.findById = originalFindById;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
});

test('User schema supports biometric device enrollment', () => {
  const User = require('../Models/Users');
  assert.ok(User.schema.path('biometricDevices'));
  assert.equal(User.schema.path('biometricDevices').instance, 'Array');
});

test('US states lookup contains 50 states with unique USPS abbreviations', () => {
  const states = require('../Utility/usStates');
  const abbreviations = states.map(({ abbreviation }) => abbreviation);

  assert.equal(states.length, 50);
  assert.equal(new Set(abbreviations).size, 50);
  assert.ok(states.some(({ name, abbreviation }) => name === 'California' && abbreviation === 'CA'));
});

test('GET /users/states returns the state options in the expected shape', () => {
  const { getUsStates } = require('../Controllers/UserController');
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

  getUsStates({}, res);

  assert.equal(statusCode, 200);
  assert.ok(Array.isArray(responseBody.states));
  assert.ok(responseBody.states.every(({ name, abbreviation }) => name && abbreviation));
  assert.equal(responseBody.states.length, 50);
});
