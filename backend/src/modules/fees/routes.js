const router = require('express').Router();
const c = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const subscriptionGuard = require('../../middlewares/subscriptionGuard');
const validate = require('../../middlewares/validate');
const { createFeeSchema, updateFeeSchema } = require('./validation');

router.use(authenticate, schoolIsolation, subscriptionGuard);

router.post('/', authorizeRoles('SCHOOL_ADMIN'), validate(createFeeSchema), c.create);
router.get('/', authorizeRoles('SCHOOL_ADMIN', 'TEACHER', 'PARENT'), c.list);
router.get('/:id', authorizeRoles('SCHOOL_ADMIN', 'TEACHER', 'PARENT'), c.get);
router.put('/:id', authorizeRoles('SCHOOL_ADMIN'), validate(updateFeeSchema), c.update);

module.exports = router;

