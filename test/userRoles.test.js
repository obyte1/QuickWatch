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
