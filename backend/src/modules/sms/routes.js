const router = require('express').Router();
const controller = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const subscriptionGuard = require('../../middlewares/subscriptionGuard');
const featureGuard = require('../../middlewares/featureGuard');
const validate = require('../../middlewares/validate');
const { sendNotificationSchema, sendBulkNotificationSchema } = require('./validation');

// All notification routes require auth, school isolation, active subscription, and feature flag
router.use(authenticate, schoolIsolation, subscriptionGuard, featureGuard('sms_notifications'));

// Send email to specific addresses
router.post('/send', authorizeRoles('SCHOOL_ADMIN'), validate(sendNotificationSchema), controller.send);

// Send bulk email to a role group
router.post('/send-bulk', authorizeRoles('SCHOOL_ADMIN'), validate(sendBulkNotificationSchema), controller.sendBulk);

// Get notification logs
router.get('/logs', authorizeRoles('SCHOOL_ADMIN'), controller.logs);

module.exports = router;
