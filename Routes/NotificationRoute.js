const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/auth');
const { authorize } = require('../Middleware/role');
const { requireActive } = require('../Middleware/accountStatus');
const {
  registerDevice,
  removeDevice,
  getPreferences,
  updatePreferences,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendToUser,
  broadcast,
} = require('../Controllers/NotificationController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         type: { type: string }
 *         title: { type: string }
 *         message: { type: string }
 *         data: { type: object }
 *         readAt: { type: string, format: date-time, nullable: true }
 *         pushStatus: { type: string }
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get the authenticated user's in-app notifications
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, maximum: 100 }
 *     responses:
 *       200: { description: Notifications returned }
 */
router.get('/', protect, requireActive, getNotifications);

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get the unread notification count
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread count returned }
 */
router.get('/unread-count', protect, requireActive, getUnreadCount);

/**
 * @swagger
 * /notifications/devices:
 *   post:
 *     summary: Register a device push token
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *               platform: { type: string }
 *     responses:
 *       201: { description: Device registered }
 */
router.post('/devices', protect, requireActive, registerDevice);
/**
 * @swagger
 * /notifications/devices/{token}:
 *   delete:
 *     summary: Remove a device push token
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Device removed }
 */
router.delete('/devices/:token', protect, requireActive, removeDevice);
router.get('/preferences', protect, requireActive, getPreferences);
/**
 * @swagger
 * /notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Preferences returned }
 */
router.patch('/preferences', protect, requireActive, updatePreferences);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark every notification as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Notifications marked as read }
 */
router.patch('/read-all', protect, requireActive, markAllAsRead);
/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark one notification as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notification marked as read }
 */
router.patch('/:id/read', protect, requireActive, markAsRead);
/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete one notification
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notification deleted }
 */
router.delete('/:id', protect, requireActive, deleteNotification);

/**
 * @swagger
 * /notifications/send:
 *   post:
 *     summary: Send an in-app and push notification to one user
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Notification sent }
 */
router.post('/send', protect, requireActive, authorize('Admin'), sendToUser);
/**
 * @swagger
 * /notifications/broadcast:
 *   post:
 *     summary: Broadcast an in-app and push notification
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Broadcast sent }
 */
router.post('/broadcast', protect, requireActive, authorize('Admin'), broadcast);

module.exports = router;
