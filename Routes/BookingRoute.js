/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         selectedStartDate:
 *           type: string
 *         startTime:
 *           type: string
 *         endTime:
 *           type: string
 *         watcherRole:
 *           type: string
 *         motherName:
 *           type: string
 *         childNo:
 *           type: number
 *         childOption2:
 *           type: string
 *         rateHour:
 *           type: string
 *         email:
 *           type: string
 *         emailTo:
 *           type: string
 *         location:
 *           type: string
 *         address:
 *           type: string
 *         zipcode:
 *           type: string
 *         picture:
 *           type: string
 *         picture2:
 *           type: string
 *         watcherName:
 *           type: string
 *         babysitterId:
 *           type: string
 *         requestedAmount:
 *           type: number
 *         childrenDescription:
 *           type: string
 *         specialInstructions:
 *           type: string
 */

const express = require('express');
const router = express.Router();
const { createBooking, getMyBookings, updateBookingStatus, cancelBooking, getBabysitterRequests, updateBookingDetails, acceptBooking } = require('../Controllers/BookingController');
const { createCompletionPaymentIntent } = require('../Controllers/PaymentController');
const { protect } = require('../Middleware/auth');
const { requireActive } = require('../Middleware/accountStatus');
const { validateBooking } = require('../Middleware/security');

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a babysitting booking request
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Booking'
 *     responses:
 *       201:
 *         description: Booking request created successfully
 */
router.post('/', protect, requireActive, validateBooking, createBooking);

/**
 * @swagger
 * /bookings/my-bookings:
 *   get:
 *     summary: Get bookings for the authenticated user
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Booking list returned successfully
 */
router.get('/my-bookings', protect, requireActive, getMyBookings);
router.get('/requests', protect, requireActive, getBabysitterRequests);
/**
 * @swagger
 * /bookings/requests:
 *   get:
 *     summary: Browse booking requests assigned to the babysitter
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Booking requests returned }
 */
/**
 * @swagger
 * /bookings/{id}/details:
 *   patch:
 *     summary: Modify a booking quote before sitter acceptance
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Booking details updated }
 */
router.patch('/:id/details', protect, requireActive, updateBookingDetails);
/**
 * @swagger
 * /bookings/{id}/accept:
 *   post:
 *     summary: Accept a booking request and calculate the company fee
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Booking accepted and payment summary returned }
 */
router.post('/:id/accept', protect, requireActive, acceptBooking);

/**
 * @swagger
 * /bookings/{bookingId}/confirm-completion:
 *   post:
 *     summary: Open the payment page for a completed booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *     responses:
 *       201:
 *         description: Stripe payment page details returned
 */
router.post('/:bookingId/confirm-completion', protect, requireActive, createCompletionPaymentIntent);

/**
 * @swagger
 * /bookings/{id}:
 *   patch:
 *     summary: Update a booking status or confirmation
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: boolean
 *               confirm:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Booking updated successfully
 */
router.patch('/:id', protect, requireActive, updateBookingStatus);
router.post('/:id/cancel', protect, requireActive, cancelBooking);

module.exports = router;
