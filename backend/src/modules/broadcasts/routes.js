const router = require('express').Router();
const c = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const validate = require('../../middlewares/validate');
const { createBroadcastSchema } = require('./validation');

router.use(authenticate);

// Anyone authenticated can list broadcasts (filtered by their role/school)
router.get('/', c.list);
router.get('/:id', c.get);

// Only SUPER_ADMIN can create or delete broadcasts
router.post('/', authorizeRoles('SUPER_ADMIN'), validate(createBroadcastSchema), c.create);
router.delete('/:id', authorizeRoles('SUPER_ADMIN'), c.remove);

module.exports = router;

