const router = require('express').Router();
const c = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const subscriptionGuard = require('../../middlewares/subscriptionGuard');
const validate = require('../../middlewares/validate');
const { createAssessmentSchema, bulkAssessmentSchema, updateAssessmentSchema } = require('./validation');

router.use(authenticate, schoolIsolation, subscriptionGuard);

// List assessments (with optional filters: class_id, subject_id, term, academic_year, pupil_id)
router.get('/', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.list);

// Pupil report card (must be before /:id)
router.get('/pupil/:pupilId/report', authorizeRoles('SCHOOL_ADMIN', 'TEACHER', 'PARENT'), c.pupilReport);

// Create a single assessment
router.post('/', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), validate(createAssessmentSchema), c.create);

// Bulk create assessments
router.post('/bulk', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), validate(bulkAssessmentSchema), c.bulkCreate);

// Get, update, delete a single assessment
router.get('/:id', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.get);
router.put('/:id', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), validate(updateAssessmentSchema), c.update);
router.delete('/:id', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.remove);

module.exports = router;

