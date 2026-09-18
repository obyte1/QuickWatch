const Payment = require('../Models/Payment');
const Booking = require('../Models/Booking');
const User = require('../Models/Users');
const WebhookEvent = require('../Models/WebhookEvent');
const sendEmail = require('../Middleware/emailsender');
const { paymentTemplate } = require('../Middleware/emailTemplates');
const { notifyUser, notifyUsers } = require('../Services/notificationService');
const stripe = process.env.STRIPE_SECRET_KEY
  && !process.env.STRIPE_SECRET_KEY.includes('your_stripe_secret_key')
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

const getUserId = (req) => req.user?.id || req.user?._id;
const getOrganizationEmail = () => process.env.ORGANIZATION_EMAIL || process.env.EMAIL_USER;

const requireStripe = (res) => {
  if (!stripe) {
    res.status(500).json({
      message: 'Stripe is not configured. Add a valid STRIPE_SECRET_KEY to your .env file.',
    });
    return false;
  }
  return true;
};

const getBookingAmount = (booking, amount) => {
  if (Number(booking.totalAmount) > 0) return Number(booking.totalAmount);
  const requestedAmount = Number(amount);
  if (Number.isFinite(requestedAmount) && requestedAmount > 0) return requestedAmount;

  const hourlyRate = Number.parseFloat(String(booking.rateHour).replace(/[^0-9.]/g, ''));
  return Number.isFinite(hourlyRate) && hourlyRate > 0 ? hourlyRate : 0;
};

exports.createCompletionPaymentIntent = async (req, res) => {
  try {
    if (!requireStripe(res)) return;

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.lifecycleStatus !== 'accepted') {
      return res.status(409).json({ message: 'The babysitter must accept the booking before payment.' });
    }
    if (booking.mother?.toString() !== getUserId(req).toString()) {
      return res.status(403).json({ message: 'Only the mother can confirm this booking.' });
    }
    if (booking.paymentStatus === 'paid') {
      return res.status(409).json({ message: 'This booking has already been paid and confirmed.' });
    }

    const amount = getBookingAmount(booking, req.body.amount);
    if (!amount) {
      return res.status(400).json({ message: 'A valid amount is required, or provide a numeric booking rateHour.' });
    }

    let paymentIntent;
    let payment = await Payment.findOne({ booking: booking._id, status: 'pending' });
    if (payment?.paymentIntentId) {
      paymentIntent = await stripe.paymentIntents.retrieve(payment.paymentIntentId);
    } else {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: (req.body.currency || 'usd').toLowerCase(),
        description: `QuickWatch booking payment ${booking._id}`,
        metadata: { bookingId: booking._id.toString(), motherId: getUserId(req).toString() },
      });
      payment = await Payment.create({
        amount,
        currency: paymentIntent.currency,
        userEmail: req.user.email,
        user: getUserId(req),
        booking: booking._id,
        paymentIntentId: paymentIntent.id,
        status: 'pending',
      });
    }

    booking.paymentStatus = 'pending';
    await booking.save();

    return res.status(201).json({
      message: 'Payment page is ready. Confirm the card using the returned clientSecret.',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency: paymentIntent.currency,
      payment,
    });
  } catch (error) {
    console.error('createCompletionPaymentIntent error:', error);
    return res.status(500).json({ message: 'Error creating the booking payment.', error: error.message });
  }
};

exports.confirmCompletionPayment = async (req, res) => {
  try {
    if (!requireStripe(res)) return;
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) return res.status(400).json({ message: 'paymentIntentId is required.' });

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(402).json({ message: 'Payment has not completed.', paymentStatus: paymentIntent.status });
    }

    const booking = await Booking.findById(paymentIntent.metadata.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.mother?.toString() !== getUserId(req).toString()) {
      return res.status(403).json({ message: 'Only the mother can confirm this booking.' });
    }

    const payment = await Payment.findOneAndUpdate(
      { paymentIntentId, booking: booking._id },
      { status: 'succeeded', stripePaymentId: paymentIntent.latest_charge || '' },
      { new: true }
    );
    if (!payment) return res.status(404).json({ message: 'Payment record not found.' });

    booking.confirm = true;
    booking.status = true;
    booking.paymentStatus = 'paid';
    booking.motherConfirmedAt = new Date();
    booking.payoutStatus = 'not_ready';
    await booking.save();

    notifyUser({
      userId: booking.babysitter,
      type: 'booking.payment_confirmed',
      title: 'Booking payment confirmed',
      message: 'The mother has confirmed the completed job and payment was received.',
      data: { bookingId: booking._id.toString(), action: 'request_payout' },
    }).catch((error) => console.error('payment notification error:', error.message));

    await sendEmail(
      req.user.email,
      'Payment Confirmation',
      paymentTemplate({ firstName: req.user.name || 'Customer', amount: payment.amount, currency: payment.currency, bookingId: booking._id }),
      `Payment received successfully for booking ${booking._id}`
    );

    return res.status(200).json({ message: 'Payment completed and job confirmed.', booking, payment });
  } catch (error) {
    console.error('confirmCompletionPayment error:', error);
    return res.status(500).json({ message: 'Error confirming the booking payment.', error: error.message });
  }
};

exports.createPayoutAccount = async (req, res) => {
  try {
    if (!requireStripe(res)) return;
    if (req.user.role !== 'Babysitter') return res.status(403).json({ message: 'Only babysitters can set up payout details.' });

    const user = await User.findById(getUserId(req));
    const country = req.body.country || 'US';
    let account = user.stripeAccountId ? await stripe.accounts.retrieve(user.stripeAccountId) : null;
    if (!account) {
      account = await stripe.accounts.create({
        type: 'express',
        country,
        email: user.Email,
        capabilities: { transfers: { requested: true } },
      });
      user.stripeAccountId = account.id;
    }

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: req.body.refreshUrl || process.env.FRONTEND_URL || 'http://localhost:3000/settings/edit-payment',
      return_url: req.body.returnUrl || process.env.FRONTEND_URL || 'http://localhost:3000/settings/edit-payment',
      type: 'account_onboarding',
    });
    user.payoutAccountStatus = 'pending';
    await user.save();

    return res.status(201).json({ message: 'Payout setup link created.', accountId: account.id, url: accountLink.url });
  } catch (error) {
    console.error('createPayoutAccount error:', error);
    return res.status(500).json({ message: 'Error creating payout setup.', error: error.message });
  }
};

exports.getPayoutAccount = async (req, res) => {
  try {
    if (!requireStripe(res)) return;
    const user = await User.findById(getUserId(req)).select('stripeAccountId payoutAccountStatus');
    if (!user?.stripeAccountId) return res.status(200).json({ configured: false, status: 'not_started' });
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    const enabled = Boolean(account.charges_enabled && account.payouts_enabled);
    if (enabled && user.payoutAccountStatus !== 'enabled') {
      user.payoutAccountStatus = 'enabled';
      await user.save();
    }
    return res.status(200).json({ configured: true, status: enabled ? 'enabled' : user.payoutAccountStatus, account });
  } catch (error) {
    console.error('getPayoutAccount error:', error);
    return res.status(500).json({ message: 'Error fetching payout setup.', error: error.message });
  }
};

exports.requestPayout = async (req, res) => {
  try {
    const userId = getUserId(req);
    const user = await User.findById(userId);
    if (!user || user.role !== 'Babysitter') return res.status(403).json({ message: 'Only babysitters can request payment.' });
    if (!user.stripeAccountId) return res.status(400).json({ message: 'Complete payment setup before requesting a payout.' });

    const booking = await Booking.findOne({ _id: req.params.bookingId, babysitter: userId });
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.paymentStatus !== 'paid' || !booking.motherConfirmedAt) {
      return res.status(409).json({ message: 'Payment can only be requested after the mother confirms and pays.' });
    }
    if (booking.payoutStatus === 'requested' || booking.payoutStatus === 'paid') {
      return res.status(200).json({ message: 'Payout request already submitted.', booking });
    }

    const updatedBooking = await Booking.findOneAndUpdate(
      { _id: booking._id, payoutStatus: 'not_ready' },
      { payoutStatus: 'requested', payoutRequestedAt: new Date() },
      { new: true }
    );
    if (!updatedBooking) return res.status(409).json({ message: 'Payout request was already submitted.' });

    await Payment.findOneAndUpdate(
      { booking: booking._id, status: 'succeeded' },
      { payoutStatus: 'requested', payoutRequestedAt: new Date() }
    );

    const organizationEmail = getOrganizationEmail();
    if (organizationEmail) {
      await sendEmail(
        organizationEmail,
        'Babysitter payout requested',
        `<p>${user.FirstName} ${user.LastName} requested payment for booking ${booking._id}.</p><p>Stripe account: ${user.stripeAccountId}</p>`,
        `Babysitter ${user.Email} requested payment for booking ${booking._id}.`
      );
    }

    const admins = await User.find({ role: 'Admin' }).select('_id');
    notifyUsers({
      userIds: admins.map((admin) => admin._id),
      type: 'payout.requested',
      title: 'Sitter payout requested',
      message: `${user.FirstName} ${user.LastName} requested payment for a completed booking.`,
      data: { bookingId: booking._id.toString(), action: 'review_payout' },
    }).catch((error) => console.error('payout notification error:', error.message));

    return res.status(201).json({ message: 'Payout request sent to the organization.', booking: updatedBooking });
  } catch (error) {
    console.error('requestPayout error:', error);
    return res.status(500).json({ message: 'Error requesting payout.', error: error.message });
  }
};

exports.processPayout = async (req, res) => {
  try {
    if (!requireStripe(res)) return;

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking || booking.payoutStatus !== 'requested' || booking.paymentStatus !== 'paid') {
      return res.status(409).json({ message: 'This booking is not ready for payout.' });
    }

    const payment = await Payment.findOne({ booking: booking._id, status: 'succeeded' });
    const sitter = await User.findById(booking.babysitter);
    if (!payment || !sitter?.stripeAccountId) {
      return res.status(400).json({ message: 'A successful payment and sitter payout account are required.' });
    }
    if (payment.payoutStatus === 'paid') {
      return res.status(200).json({ message: 'Payout has already been processed.', payment });
    }

    const transfer = await stripe.transfers.create({
      amount: Math.round(payment.amount * 100),
      currency: payment.currency,
      destination: sitter.stripeAccountId,
      description: `QuickWatch sitter payout for booking ${booking._id}`,
      metadata: { bookingId: booking._id.toString(), sitterId: sitter._id.toString() },
    });

    payment.payoutStatus = 'paid';
    payment.payoutTransferId = transfer.id;
    await payment.save();
    booking.payoutStatus = 'paid';
    await booking.save();

    if (sitter.Email) {
      await sendEmail(
        sitter.Email,
        'Your QuickWatch payment has been sent',
        `<p>Your payment for booking ${booking._id} has been sent to your connected payout account.</p>`,
        `Your payment for booking ${booking._id} has been sent.`
      );
    }

    notifyUser({
      userId: sitter._id,
      type: 'payout.paid',
      title: 'Payment sent',
      message: 'Your payment has been sent to your connected payout account.',
      data: { bookingId: booking._id.toString(), transferId: transfer.id, action: 'view_payment' },
    }).catch((error) => console.error('payout notification error:', error.message));

    return res.status(200).json({ message: 'Payout sent to the sitter account.', transfer, booking, payment });
  } catch (error) {
    console.error('processPayout error:', error);
    return res.status(500).json({ message: 'Error processing payout.', error: error.message });
  }
};

exports.createPayment = async (req, res) => {
  try {
    const { amount, currency, bookingId, userEmail, paymentMethodId } = req.body;

    if (!amount || !userEmail || !paymentMethodId) {
      return res.status(400).json({
        message: 'amount, userEmail and paymentMethodId are required.',
      });
    }

    if (!stripe) {
      return res.status(500).json({
        message: 'Stripe is not configured. Add STRIPE_SECRET_KEY to your .env file.',
      });
    }

    const charge = await stripe.charges.create({
      amount: Math.round(Number(amount) * 100),
      currency: (currency || 'usd').toLowerCase(),
      source: paymentMethodId,
      description: `QuickWatch booking payment for ${userEmail}`,
    });

    const payment = await Payment.create({
      amount: Number(amount),
      currency: (currency || 'usd').toLowerCase(),
      userEmail,
      user: req.user?.id || req.user?._id || null,
      booking: bookingId || null,
      stripePaymentId: charge.id,
    });

    if (bookingId) {
      const Booking = require('../Models/Booking');
      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.confirm = true;
        booking.status = true;
        await booking.save();

        const user = req.user?.email ? { FirstName: req.user?.name || 'Customer', Email: req.user.email } : { FirstName: 'Customer', Email: userEmail };
        const paymentHtml = paymentTemplate({
          firstName: user.FirstName,
          amount: Number(amount),
          currency: (currency || 'usd').toLowerCase(),
          bookingId: bookingId,
        });

        await sendEmail(
          user.Email,
          'Payment Confirmation',
          paymentHtml,
          `Payment received successfully for booking ${bookingId}`
        );
      }
    }

    return res.status(201).json({
      message: 'Payment successful and booking confirmed.',
      payment,
      stripeCharge: charge,
    });
  } catch (error) {
    console.error('createPayment error:', error);
    return res.status(500).json({
      message: 'Error creating payment.',
      error: error.message,
    });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      user: req.user?.id || req.user?._id,
    }).populate('booking');

    return res.status(200).json({ payments });
  } catch (error) {
    console.error('getPayments error:', error);
    return res.status(500).json({
      message: 'Error fetching payments.',
      error: error.message,
    });
  }
};

exports.handleStripeWebhook = async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ message: 'Stripe webhook is not configured.' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).json({ message: `Invalid Stripe webhook: ${error.message}` });
  }

  try {
    const alreadyProcessed = await WebhookEvent.exists({ eventId: event.id });
    if (alreadyProcessed) return res.status(200).json({ received: true, duplicate: true });
    await WebhookEvent.create({ eventId: event.id, type: event.type });

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const payment = await Payment.findOneAndUpdate(
        { paymentIntentId: intent.id },
        { status: 'succeeded', stripePaymentId: intent.latest_charge || '' },
        { new: true }
      );
      if (payment?.booking) {
        const booking = await Booking.findByIdAndUpdate(payment.booking, {
          paymentStatus: 'paid',
          confirm: true,
          motherConfirmedAt: new Date(),
        }, { new: true });
        if (booking) {
          notifyUser({
            userId: booking.babysitter,
            type: 'booking.payment_confirmed',
            title: 'Payment confirmed',
            message: 'Payment for your completed booking was confirmed.',
            data: { bookingId: booking._id.toString(), action: 'request_payout' },
          }).catch((error) => console.error('webhook notification error:', error.message));
        }
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      const payment = await Payment.findOneAndUpdate(
        { paymentIntentId: intent.id },
        { status: 'failed' },
        { new: true }
      );
      if (payment?.booking) await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'failed' });
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      const payment = await Payment.findOneAndUpdate(
        { stripePaymentId: charge.id },
        {
          status: 'refunded',
          stripeRefundId: charge.refunds?.data?.[0]?.id || '',
          refundedAmount: charge.amount_refunded ? charge.amount_refunded / 100 : 0,
        },
        { new: true }
      );
      if (payment?.booking) {
        await Booking.findByIdAndUpdate(payment.booking, {
          paymentStatus: 'failed',
          lifecycleStatus: 'refunded',
          refundedAt: new Date(),
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('handleStripeWebhook error:', error);
    return res.status(500).json({ message: 'Webhook processing failed.' });
  }
};

exports.refundBookingPayment = async (req, res) => {
  try {
    if (!requireStripe(res)) return;
    const userId = getUserId(req);
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (req.user.role !== 'Admin' && booking.mother?.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the mother or an admin can request a refund.' });
    }

    const payment = await Payment.findOne({ booking: booking._id, status: 'succeeded' });
    if (!payment) return res.status(409).json({ message: 'No successful payment is available to refund.' });
    if (payment.status === 'refunded' || payment.stripeRefundId) {
      return res.status(200).json({ message: 'Payment has already been refunded.', payment });
    }

    const refund = await stripe.refunds.create({
      payment_intent: payment.paymentIntentId || undefined,
      charge: payment.paymentIntentId ? undefined : payment.stripePaymentId,
      metadata: { bookingId: booking._id.toString() },
    });
    payment.status = 'refunded';
    payment.stripeRefundId = refund.id;
    payment.refundedAmount = refund.amount ? refund.amount / 100 : payment.amount;
    await payment.save();
    booking.paymentStatus = 'failed';
    booking.lifecycleStatus = 'refunded';
    booking.refundedAt = new Date();
    await booking.save();

    return res.status(200).json({ message: 'Payment refunded successfully.', refund, booking, payment });
  } catch (error) {
    console.error('refundBookingPayment error:', error);
    return res.status(500).json({ message: 'Error refunding payment.', error: error.message });
  }
};
