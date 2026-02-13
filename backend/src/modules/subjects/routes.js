const router = require('express').Router();
const c = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const subscriptionGuard = require('../../middlewares/subscriptionGuard');
const validate = require('../../middlewares/validate');
const { createSubjectSchema, updateSubjectSchema, assignTeacherSchema } = require('./validation');

router.use(authenticate, schoolIsolation, subscriptionGuard);

// Teacher-Subject Assignments (must come BEFORE /:id param routes)
router.get('/assignments/list', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.listAssignments);
router.post('/assignments', authorizeRoles('SCHOOL_ADMIN'), validate(assignTeacherSchema), c.assign);
router.delete('/assignments/:assignmentId', authorizeRoles('SCHOOL_ADMIN'), c.unassign);

// Subject CRUD
router.post('/', authorizeRoles('SCHOOL_ADMIN'), validate(createSubjectSchema), c.create);
router.get('/', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.list);
router.get('/:id', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.get);
router.put('/:id', authorizeRoles('SCHOOL_ADMIN'), validate(updateSubjectSchema), c.update);
router.delete('/:id', authorizeRoles('SCHOOL_ADMIN'), c.remove);

module.exports = router;
