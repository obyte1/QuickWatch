/**
 * @swagger
 * components:
 *   schemas:
 *     ChatMessage:
 *       type: object
 *       required:
 *         - bookingId
 *         - receiverId
 *         - chat
 *       properties:
 *         bookingId:
 *           type: string
 *         receiverId:
 *           type: string
 *         chat:
 *           type: string
 */

const express = require('express');
const router = express.Router();
const { sendMessage, getBookingMessages } = require('../Controllers/ChatController');
const { protect } = require('../Middleware/auth');
const { requireActive } = require('../Middleware/accountStatus');

/**
 * @swagger
 * /chats:
 *   post:
 *     summary: Send a chat message in a booking conversation
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatMessage'
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
router.post('/', protect, requireActive, sendMessage);

/**
 * @swagger
 * /chats/booking/{bookingId}:
 *   get:
 *     summary: Get all chat messages for a booking
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages fetched successfully
 */
router.get('/booking/:bookingId', protect, requireActive, getBookingMessages);

module.exports = router;
