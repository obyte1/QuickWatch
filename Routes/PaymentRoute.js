/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       required:
 *         - amount
 *         - userEmail
 *         - paymentMethodId
 *       properties:
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         bookingId:
 *           type: string
 *         userEmail:
 *           type: string
 *         paymentMethodId:
 *           type: string
 */

const express = require('express');
const router = express.Router();
const {
	createPayment,
	getPayments,
	confirmCompletionPayment,
	createPayoutAccount,
	getPayoutAccount,
	requestPayout,
	processPayout,
	refundBookingPayment,
} = require('../Controllers/PaymentController');
const { protect } = require('../Middleware/auth');
const { authorize } = require('../Middleware/role');
const { requireActive } = require('../Middleware/accountStatus');

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Create a payment for a booking
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Payment'
 *     responses:
 *       201:
 *         description: Payment successful
 */
router.post('/', protect, requireActive, createPayment);

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Get payment history for the authenticated user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payments fetched successfully
 */
router.get('/', protect, requireActive, getPayments);

/**
 * @swagger
 * /payments/bookings/{bookingId}/confirm:
 *   post:
 *     summary: Confirm a successful mother payment and complete the booking
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentIntentId]
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment and booking confirmed
 */
router.post('/bookings/:bookingId/confirm', protect, requireActive, confirmCompletionPayment);

/**
 * @swagger
 * /payments/payout-account:
 *   post:
 *     summary: Create a sitter payout account setup link
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               country:
 *                 type: string
 *                 default: US
 *                 description: Two-letter country code for the connected account
 *               refreshUrl:
 *                 type: string
 *                 format: uri
 *                 description: Return destination when onboarding must be resumed
 *               returnUrl:
 *                 type: string
 *                 format: uri
 *                 description: Return destination after onboarding
 *     responses:
 *       201:
 *         description: Stripe Connect onboarding link returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [message, accountId, url]
 *               properties:
 *                 message: { type: string }
 *                 accountId: { type: string }
 *                 url: { type: string, format: uri }
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Only babysitters can set up payout details
 *       503:
 *         description: Stripe is not configured
 */
router.post('/payout-account', protect, requireActive, createPayoutAccount);

/**
 * @swagger
 * /payments/payout-account:
 *   get:
 *     summary: Get sitter payout account status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payout account status returned
 */
router.get('/payout-account', protect, requireActive, getPayoutAccount);

/**
 * @swagger
 * /payments/bookings/{bookingId}/request-payout:
 *   post:
 *     summary: Request sitter payment after the mother has paid
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Payout request sent to the organization
 */
router.post('/bookings/:bookingId/request-payout', protect, requireActive, requestPayout);
/**
 * @swagger
 * /payments/bookings/{bookingId}/process-payout:
 *   post:
 *     summary: Process a requested sitter payout (admin only)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payout transfer created }
 *       403: { description: Admin access required }
 *       409: { description: Booking is not ready for payout }
 */
router.post('/bookings/:bookingId/process-payout', protect, requireActive, authorize('Admin'), processPayout);

/**
 * @swagger
 * /payments/bookings/{bookingId}/refund:
 *   post:
 *     summary: Refund a booking payment
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payment refunded }
 */
router.post('/bookings/:bookingId/refund', protect, requireActive, refundBookingPayment);

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Receive signed Stripe payment events
 *     tags: [Payments]
 *     responses:
 *       200: { description: Webhook received }
 */

module.exports = router;
