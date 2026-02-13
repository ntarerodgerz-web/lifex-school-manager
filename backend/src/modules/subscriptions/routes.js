const router = require('express').Router();
const c = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const validate = require('../../middlewares/validate');
const { createSubscriptionSchema } = require('./validation');

router.use(authenticate);

// Only SUPER_ADMIN can create subscriptions (billing admin)
router.post('/', authorizeRoles('SUPER_ADMIN'), validate(createSubscriptionSchema), c.create);

// School admin can view their subscription
router.get('/', schoolIsolation, authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), c.list);
router.get('/active', schoolIsolation, authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), c.active);

module.exports = router;

