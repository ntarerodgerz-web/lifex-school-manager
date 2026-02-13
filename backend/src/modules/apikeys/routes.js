const router = require('express').Router();
const controller = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const subscriptionGuard = require('../../middlewares/subscriptionGuard');
const featureGuard = require('../../middlewares/featureGuard');
const validate = require('../../middlewares/validate');
const { createApiKeySchema } = require('./validation');

// All API key management routes require auth, school isolation, active sub, and api_access feature
router.use(authenticate, schoolIsolation, subscriptionGuard, featureGuard('api_access'));

// List all keys
router.get('/', authorizeRoles('SCHOOL_ADMIN'), controller.list);

// Create a new key
router.post('/', authorizeRoles('SCHOOL_ADMIN'), validate(createApiKeySchema), controller.create);

// Revoke a key (soft-disable)
router.put('/:id/revoke', authorizeRoles('SCHOOL_ADMIN'), controller.revoke);

// Delete a key permanently
router.delete('/:id', authorizeRoles('SCHOOL_ADMIN'), controller.remove);

module.exports = router;

