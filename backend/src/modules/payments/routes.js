const router = require('express').Router();
const c = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const subscriptionGuard = require('../../middlewares/subscriptionGuard');
const validate = require('../../middlewares/validate');
const { createPaymentSchema } = require('./validation');

router.use(authenticate, schoolIsolation, subscriptionGuard);

router.post('/', authorizeRoles('SCHOOL_ADMIN'), validate(createPaymentSchema), c.create);
router.get('/', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.list);
router.get('/balance/:pupilId', authorizeRoles('SCHOOL_ADMIN', 'TEACHER', 'PARENT'), c.balance);

module.exports = router;

