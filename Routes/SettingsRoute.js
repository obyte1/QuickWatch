const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/auth');
const { authorize } = require('../Middleware/role');
const { requireActive } = require('../Middleware/accountStatus');
const { getCompanySettings, updateCompanySettings } = require('../Controllers/SettingsController');

/**
 * @swagger
 * /settings/company:
 *   get:
 *     summary: Get company fee settings
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Company settings returned }
 */
router.get('/company', protect, requireActive, authorize('Admin'), getCompanySettings);
/**
 * @swagger
 * /settings/company:
 *   patch:
 *     summary: Configure the extra company amount per hour
 *     tags: [Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Company settings updated }
 */
router.patch('/company', protect, requireActive, authorize('Admin'), updateCompanySettings);

module.exports = router;
