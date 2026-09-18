const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/auth');
const { requireActive } = require('../Middleware/accountStatus');
const { createReview, getBabysitterReviews, getMotherReviews } = require('../Controllers/ReviewController');

/**
 * @swagger
 * /reviews/bookings/{bookingId}:
 *   post:
 *     summary: Review a completed booking
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: Review created }
 */
router.post('/bookings/:bookingId', protect, requireActive, createReview);
/**
 * @swagger
 * /reviews/babysitters/{babysitterId}:
 *   get:
 *     summary: Get babysitter reviews
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: babysitterId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Reviews returned }
 */
router.get('/babysitters/:babysitterId', protect, requireActive, getBabysitterReviews);
/**
 * @swagger
 * /reviews/mothers/{motherId}:
 *   get:
 *     summary: Get reviews received by a mother
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: motherId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Mother reviews returned }
 */
router.get('/mothers/:motherId', protect, requireActive, getMotherReviews);

module.exports = router;
