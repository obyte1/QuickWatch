/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterUser:
 *       type: object
 *       required:
 *         - FirstName
 *         - LastName
 *         - Email
 *         - Password
 *         - Gender
 *         - Phone
 *         - zipCode
 *         - Address
 *       properties:
 *         FirstName:
 *           type: string
 *         LastName:
 *           type: string
 *         Email:
 *           type: string
 *         Password:
 *           type: string
 *         Gender:
 *           type: string
 *         Phone:
 *           type: string
 *         zipCode:
 *           type: string
 *         Address:
 *           type: string
 *         hourlyRate:
 *           type: number
 *           description: Required when role is Babysitter
 *         role:
 *           type: string
 *           enum: [Babysitter, Mother, Admin]
 *     LoginUser:
 *       type: object
 *       required:
 *         - Email
 *         - Password
 *       properties:
 *         Email:
 *           type: string
 *         Password:
 *           type: string
 *     ForgotPassword:
 *       type: object
 *       required:
 *         - Email
 *       properties:
 *         Email:
 *           type: string
 *     ResetPassword:
 *       type: object
 *       required:
 *         - Email
 *         - Token
 *         - Password
 *       properties:
 *         Email:
 *           type: string
 *         Token:
 *           type: string
 *         Password:
 *           type: string
 */

const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  getBabysitters,
  getPendingBabysitters,
  updateUserStatus,
} = require('../Controllers/UserController');
const { protect } = require('../Middleware/auth');
const { authorize } = require('../Middleware/role');
const upload = require('../Middleware/upload');
const { updateProfile, getMyProfile } = require('../Controllers/ProfileController');
const { authLimiter, passwordLimiter, validateRegistration, validateLogin } = require('../Middleware/security');
const { requireActive } = require('../Middleware/accountStatus');

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterUser'
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/register', authLimiter, validateRegistration, registerUser);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginUser'
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', authLimiter, validateLogin, loginUser);

/**
 * @swagger
 * /users/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPassword'
 *     responses:
 *       200:
 *         description: Reset link sent if account exists
 */
router.post('/forgot-password', passwordLimiter, forgotPassword);

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     summary: Reset a user's password using a token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPassword'
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post('/reset-password', passwordLimiter, resetPassword);

/**
 * @swagger
 * /users/verify-email:
 *   get:
 *     summary: Verify a registered user's email address
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: email
 *         required: true
 *         schema: { type: string, format: email }
 *     responses:
 *       200: { description: Email verified }
 */
router.get('/verify-email', verifyEmail);

/**
 * @swagger
 * /users/resend-verification:
 *   post:
 *     summary: Resend the email verification link
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [Email]
 *             properties:
 *               Email: { type: string, format: email }
 *     responses:
 *       200: { description: Verification email request accepted }
 */
router.post('/resend-verification', passwordLimiter, resendVerificationEmail);

/**
 * @swagger
 * /users/babysitters:
 *   get:
 *     summary: Get approved babysitters and their booking availability
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Check availability on this date
 *       - in: query
 *         name: startTime
 *         schema: { type: string }
 *         description: Check availability from this time
 *       - in: query
 *         name: endTime
 *         schema: { type: string }
 *         description: Check availability until this time
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Babysitter profiles and availability returned
 */
router.get('/babysitters', protect, getBabysitters);
router.get('/me', protect, getMyProfile);
/**
 * @swagger
 * /users/me/profile:
 *   patch:
 *     summary: Update the authenticated profile and optional picture
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               picture: { type: string, format: binary }
 *               hourlyRate: { type: number }
 *               about: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *     responses:
 *       200: { description: Profile updated }
 */
router.patch('/me/profile', protect, requireActive, upload.single('picture'), updateProfile);

/**
 * @swagger
 * /users/pending-babysitters:
 *   get:
 *     summary: Get babysitter signup requests needing admin approval
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending babysitters
 */
router.get('/pending-babysitters', protect, requireActive, authorize('Admin'), getPendingBabysitters);

/**
 * @swagger
 * /users/status/{id}:
 *   patch:
 *     summary: Update a user's status
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Active, pendingReview, Rejected, Suspended]
 *     responses:
 *       200:
 *         description: User status updated
 */
router.patch('/status/:id', protect, requireActive, authorize('Admin'), updateUserStatus);

module.exports = router;
