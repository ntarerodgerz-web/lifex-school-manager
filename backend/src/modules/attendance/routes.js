const router = require('express').Router();
const c = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const subscriptionGuard = require('../../middlewares/subscriptionGuard');
const validate = require('../../middlewares/validate');
const { recordAttendanceSchema, bulkAttendanceSchema } = require('./validation');

router.use(authenticate, schoolIsolation, subscriptionGuard);

router.post('/', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), validate(recordAttendanceSchema), c.record);
router.post('/bulk', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), validate(bulkAttendanceSchema), c.bulkRecord);
router.get('/summary', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.dailySummary);
router.get('/class/:classId', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.getByClass);
router.get('/pupil/:pupilId', authorizeRoles('SCHOOL_ADMIN', 'TEACHER', 'PARENT'), c.getByPupil);

module.exports = router;

