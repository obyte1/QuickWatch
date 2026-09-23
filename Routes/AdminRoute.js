const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/auth');
const { authorize } = require('../Middleware/role');
const { requireActive } = require('../Middleware/accountStatus');
const {
	getOverview,
	getUserSummaryCards,
	getUsers,
	getBabysitterById,
	updateUserStatus,
	approveBabysitterRequest,
	rejectBabysitterRequest,
	getBookings,
	getPayments,
} = require('../Controllers/AdminController');
const { getAdminBookingChat } = require('../Controllers/ChatController');

router.use(protect, requireActive, authorize('Admin'));
/**
 * @swagger
 * /admin/overview:
 *   get:
 *     summary: Get platform metrics
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Overview returned }
 */
router.get('/overview', getOverview);
router.get('/user-summary-cards', getUserSummaryCards);
/**
 * @swagger
 * /admin/user-summary-cards:
 *   get:
 *     summary: Get counts for dashboard user, booking, and payment summary cards
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Summary counts returned }
 */
/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List platform users
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by first name, last name, or email
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *         description: Filter by role. Accepts multiple values as a comma-separated list, e.g. Mother,Babysitter
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by status. Accepts multiple values as a comma-separated list, e.g. Active,pendingReview
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Users returned with pagination metadata and status in each user DTO
 */
router.get('/users', getUsers);
/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get one babysitter by ID
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Babysitter returned }
 */
router.get('/users/:id', getBabysitterById);
router.get('/babysitters/:id', getBabysitterById);
/**
 * @swagger
 * /admin/babysitters/{id}:
 *   get:
 *     summary: Get a babysitter by ID
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Babysitter returned }
 */
/**
 * @swagger
 * /admin/users/{id}/status:
 *   patch:
 *     summary: Approve, reject, suspend, or return a user to review
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Active, Rejected, Suspended, pendingReview]
 *                 description: Use status directly, or send action instead
 *               action:
 *                 type: string
 *                 enum: [approve, reject, suspend, review]
 *                 description: Alternate shorthand for status updates
 *               reason:
 *                 type: string
 *                 description: Required when rejecting a user or babysitter request
 *     responses:
 *       200: { description: User status updated and email sent }
 */
router.patch('/users/:id/status', updateUserStatus);
router.patch('/babysitters/:id/status', updateUserStatus);
router.patch('/babysitters/:id/approve', approveBabysitterRequest);
router.patch('/babysitters/:id/reject', rejectBabysitterRequest);
/**
 * @swagger
 * /admin/babysitters/{id}/approve:
 *   patch:
 *     summary: Approve a babysitter request
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve]
 *     responses:
 *       200: { description: Babysitter request approved and email sent }
 */
/**
 * @swagger
 * /admin/babysitters/{id}/reject:
 *   patch:
 *     summary: Reject a babysitter request
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Your profile is incomplete
 *     responses:
 *       200: { description: Babysitter request rejected and email sent }
 */
/**
 * @swagger
 * /admin/bookings:
 *   get:
 *     summary: List platform bookings
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Bookings returned }
 */
router.get('/bookings', getBookings);
/**
 * @swagger
 * /admin/bookings/{bookingId}/chat:
 *   get:
 *     summary: View the chat for a booking request or confirmed booking
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Booking details, participants, and messages returned }
 *       404: { description: Booking not found }
 */
router.get('/bookings/:bookingId/chat', getAdminBookingChat);
/**
 * @swagger
 * /admin/payments:
 *   get:
 *     summary: List platform payments
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Payments returned }
 */
router.get('/payments', getPayments);

module.exports = router;
