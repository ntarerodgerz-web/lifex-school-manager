const router = require('express').Router();
const c = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const subscriptionGuard = require('../../middlewares/subscriptionGuard');

router.use(authenticate, schoolIsolation, subscriptionGuard);

router.get('/summary', authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'), c.schoolSummary);
router.get('/attendance', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.attendanceReport);
router.get('/financial', authorizeRoles('SCHOOL_ADMIN'), c.financialReport);
router.get('/enrollment', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.enrollmentReport);
router.get('/teachers', authorizeRoles('SCHOOL_ADMIN'), c.teacherSummaryReport);
router.get('/school-profile', authorizeRoles('SCHOOL_ADMIN', 'TEACHER'), c.schoolProfileReport);

module.exports = router;

