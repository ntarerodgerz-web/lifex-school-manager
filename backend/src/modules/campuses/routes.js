const router = require('express').Router();
const controller = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const subscriptionGuard = require('../../middlewares/subscriptionGuard');
const featureGuard = require('../../middlewares/featureGuard');
const validate = require('../../middlewares/validate');
const { createCampusSchema, updateCampusSchema } = require('./validation');

// All campus routes require auth, school isolation, active subscription, and multi_campus feature
router.use(authenticate, schoolIsolation, subscriptionGuard, featureGuard('multi_campus'));

// List all campuses
router.get('/', controller.list);

// Get single campus
router.get('/:id', controller.get);

// Create campus (admin only)
router.post('/', authorizeRoles('SCHOOL_ADMIN'), validate(createCampusSchema), controller.create);

// Update campus (admin only)
router.put('/:id', authorizeRoles('SCHOOL_ADMIN'), validate(updateCampusSchema), controller.update);

// Delete campus (admin only)
router.delete('/:id', authorizeRoles('SCHOOL_ADMIN'), controller.remove);

module.exports = router;

