const router = require('express').Router();
const c = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const subscriptionGuard = require('../../middlewares/subscriptionGuard');
const planLimitGuard = require('../../middlewares/planLimitGuard');
const validate = require('../../middlewares/validate');
const { createPupilSchema, updatePupilSchema } = require('./validation');
const { photoUpload } = require('../../utils/upload');

router.use(authenticate, schoolIsolation, subscriptionGuard);

router.post('/', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), planLimitGuard('pupils'), validate(createPupilSchema), c.create);
router.get('/', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.list);
router.get('/:id', authorizeRoles('SCHOOL_ADMIN', 'TEACHER', 'PARENT'), c.get);
router.put('/:id', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), validate(updatePupilSchema), c.update);
router.put('/:id/photo', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), photoUpload.single('photo'), c.uploadPhoto);
router.delete('/:id', authorizeRoles('SCHOOL_ADMIN'), c.remove);

module.exports = router;

