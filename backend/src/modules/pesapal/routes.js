const router = require('express').Router();
const controller = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');

// Public: get plans (no auth needed — for pricing page)
router.get('/plans', controller.getPlans);

// Public: PesaPal IPN callback (PesaPal server calls this — no auth)
router.get('/ipn', controller.ipnCallback);

// Authenticated routes
router.use(authenticate);

// Initiate payment (school admins)
router.post(
  '/initiate',
  authorizeRoles('SCHOOL_ADMIN'),
  controller.initiatePayment
);

// Check payment status
router.get(
  '/status/:orderTrackingId',
  authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'),
  controller.checkStatus
);


module.exports = router;

