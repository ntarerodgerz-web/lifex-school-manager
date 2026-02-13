const router = require('express').Router();
const controller = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const subscriptionGuard = require('../../middlewares/subscriptionGuard');
const validate = require('../../middlewares/validate');
const { createUserSchema, updateUserSchema } = require('./validation');
const { avatarUpload } = require('../../utils/upload');

router.use(authenticate, schoolIsolation, subscriptionGuard);

// Any authenticated user can upload their own avatar
router.put('/me/avatar', avatarUpload.single('avatar'), controller.uploadAvatar);

router.post('/', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), validate(createUserSchema), controller.createUser);
router.get('/', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), controller.listUsers);
router.get('/:id', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), controller.getUser);
router.put('/:id', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), validate(updateUserSchema), controller.updateUser);
router.delete('/:id', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN'), controller.deactivateUser);

module.exports = router;

