const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTime, normalizeDate, bookingsOverlap, isBlockingBooking } = require('../Utility/bookingAvailability');

test('parses 12-hour and 24-hour times', () => {
  assert.equal(parseTime('9:00 AM'), 540);
  assert.equal(parseTime('5:30 PM'), 1050);
  assert.equal(parseTime('17:30'), 1050);
});

test('normalizes booking dates', () => {
  assert.equal(normalizeDate('2026-09-20'), '2026-09-20');
  assert.equal(normalizeDate('invalid-date'), '');
});

test('detects overlapping booking intervals', () => {
  const existing = { selectedStartDate: '2026-09-20', startTime: '09:00', endTime: '12:00', status: true };
  const overlapping = { selectedStartDate: '2026-09-20', startTime: '11:00', endTime: '13:00' };
  const separate = { selectedStartDate: '2026-09-20', startTime: '12:00', endTime: '13:00' };
  assert.equal(isBlockingBooking(existing), true);
  assert.equal(bookingsOverlap(existing, overlapping), true);
  assert.equal(bookingsOverlap(existing, separate), false);
});
