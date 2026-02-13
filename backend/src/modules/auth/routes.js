const router = require('express').Router();
const controller = require('./controller');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authenticate');
const {
  loginSchema,
  registerSchoolSchema,
  refreshTokenSchema,
  changePasswordSchema,
} = require('./validation');

// Public routes
router.post('/login', validate(loginSchema), controller.login);
router.post('/register', validate(registerSchoolSchema), controller.register);
router.post('/refresh', validate(refreshTokenSchema), controller.refresh);

// Protected routes
router.get('/me', authenticate, controller.getMe);
router.put('/change-password', authenticate, validate(changePasswordSchema), controller.changePassword);
router.post('/logout', authenticate, controller.logout);

module.exports = router;

