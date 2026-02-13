const router = require('express').Router();
const controller = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorizeRoles = require('../../middlewares/authorizeRoles');
const schoolIsolation = require('../../middlewares/schoolIsolation');
const featureGuard = require('../../middlewares/featureGuard');
const validate = require('../../middlewares/validate');
const { updateSchoolSchema, updateBrandingSchema } = require('./validation');
const { badgeUpload } = require('../../utils/upload');

// All routes require authentication
router.use(authenticate);

// SUPER_ADMIN: list all schools
router.get('/', authorizeRoles('SUPER_ADMIN'), controller.listSchools);

// Get current school profile (must be before /:id)
router.get(
  '/me',
  schoolIsolation,
  authorizeRoles('SCHOOL_ADMIN', 'TEACHER', 'PARENT'),
  controller.getSchool
);

// Get plan limits + usage (must be before /:id)
router.get(
  '/me/plan-usage',
  schoolIsolation,
  authorizeRoles('SCHOOL_ADMIN'),
  controller.getPlanUsage
);

// Update current school (must be before /:id)
router.put(
  '/me',
  schoolIsolation,
  authorizeRoles('SCHOOL_ADMIN'),
  validate(updateSchoolSchema),
  controller.updateSchool
);

// SUPER_ADMIN: update any school by ID
router.put('/:id', authorizeRoles('SUPER_ADMIN'), controller.updateSchoolById);

// Upload school badge
router.put(
  '/me/badge',
  schoolIsolation,
  authorizeRoles('SCHOOL_ADMIN'),
  badgeUpload.single('badge'),
  controller.uploadBadge
);

// Update branding (requires theme_customization feature)
router.put(
  '/me/branding',
  schoolIsolation,
  authorizeRoles('SCHOOL_ADMIN'),
  featureGuard('theme_customization'),
  validate(updateBrandingSchema),
  controller.updateBranding
);

module.exports = router;

