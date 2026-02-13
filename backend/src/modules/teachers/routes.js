const router = require('express').Router();
const c = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const subscriptionGuard = require('../../middlewares/subscriptionGuard');
const planLimitGuard = require('../../middlewares/planLimitGuard');
const validate = require('../../middlewares/validate');
const { createTeacherSchema, updateTeacherSchema } = require('./validation');
const { avatarUpload } = require('../../utils/upload');

router.use(authenticate, schoolIsolation, subscriptionGuard);

router.post('/', authorizeRoles('SCHOOL_ADMIN'), planLimitGuard('teachers'), validate(createTeacherSchema), c.create);
router.get('/', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), c.list);
router.get('/:id', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.get);
router.put('/:id', authorizeRoles('SCHOOL_ADMIN'), validate(updateTeacherSchema), c.update);
router.put('/:id/photo', authorizeRoles('SCHOOL_ADMIN'), avatarUpload.single('photo'), c.uploadPhoto);
router.delete('/:id', authorizeRoles('SCHOOL_ADMIN'), c.remove);

module.exports = router;

