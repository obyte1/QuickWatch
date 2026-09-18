const parseTime = (value) => {
  if (!value) return null;
  const match = String(value).trim().toUpperCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  if (minutes > 59) return null;
  if (match[3] === 'PM' && hours < 12) hours += 12;
  if (match[3] === 'AM' && hours === 12) hours = 0;
  if (hours > 23) return null;
  return hours * 60 + minutes;
};

const normalizeDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const isBlockingBooking = (booking) => (
  !['cancelled', 'declined', 'refunded'].includes(booking.lifecycleStatus)
  && (
    booking.status === true
    || booking.confirm === true
    || ['requested', 'accepted', 'inProgress', 'completed', 'pending', 'paid'].includes(booking.lifecycleStatus)
    || ['pending', 'paid'].includes(booking.paymentStatus)
  )
);

const intervalsOverlap = (firstStart, firstEnd, secondStart, secondEnd) => {
  if ([firstStart, firstEnd, secondStart, secondEnd].some((value) => value === null)) return true;
  return firstStart < secondEnd && secondStart < firstEnd;
};

const bookingsOverlap = (first, second) => (
  normalizeDate(first.selectedStartDate) === normalizeDate(second.selectedStartDate)
  && intervalsOverlap(
    parseTime(first.startTime),
    parseTime(first.endTime),
    parseTime(second.startTime),
    parseTime(second.endTime)
  )
);

module.exports = {
  parseTime,
  normalizeDate,
  isBlockingBooking,
  bookingsOverlap,
};
