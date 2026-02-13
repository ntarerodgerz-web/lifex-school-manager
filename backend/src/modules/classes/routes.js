const router = require('express').Router();
const c = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const subscriptionGuard = require('../../middlewares/subscriptionGuard');
const planLimitGuard = require('../../middlewares/planLimitGuard');
const validate = require('../../middlewares/validate');
const { createClassSchema, updateClassSchema } = require('./validation');

router.use(authenticate, schoolIsolation, subscriptionGuard);

router.post('/', authorizeRoles('SCHOOL_ADMIN'), planLimitGuard('classes'), validate(createClassSchema), c.create);
router.get('/', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.list);
router.get('/:id', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.get);
router.put('/:id', authorizeRoles('SCHOOL_ADMIN'), validate(updateClassSchema), c.update);
router.delete('/:id', authorizeRoles('SCHOOL_ADMIN'), c.remove);

module.exports = router;

