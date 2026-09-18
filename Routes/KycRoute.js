const express = require('express');
const router = express.Router();
const upload = require('../Middleware/upload');
const { protect } = require('../Middleware/auth');
const { authorize } = require('../Middleware/role');
const { requireActive } = require('../Middleware/accountStatus');
const {
  submitKyc,
  getMyKyc,
  getKycApplications,
  reviewKyc,
} = require('../Controllers/KycController');

/**
 * @swagger
 * /kyc:
 *   post:
 *     summary: Submit KYC documents for a mother or babysitter
 *     tags: [KYC]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: KYC submitted }
 */
router.post(
  '/',
  protect,
  requireActive,
  upload.fields([{ name: 'proofOfAddress', maxCount: 1 }, { name: 'identityCard', maxCount: 1 }]),
  submitKyc
);
router.get('/me', protect, requireActive, getMyKyc);
/**
 * @swagger
 * /kyc:
 *   get:
 *     summary: List KYC applications for admin review
 *     tags: [KYC]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: KYC applications returned }
 */
router.get('/', protect, requireActive, authorize('Admin'), getKycApplications);
/**
 * @swagger
 * /kyc/{id}/review:
 *   patch:
 *     summary: Approve or reject a KYC application
 *     tags: [KYC]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: KYC reviewed }
 */
router.patch('/:id/review', protect, requireActive, authorize('Admin'), reviewKyc);

module.exports = router;
