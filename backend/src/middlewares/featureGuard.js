/**
 * Feature Guard Middleware Factory
 * ─────────────────────────────────────────────────────────
 * Checks whether a school's current plan includes a specific
 * boolean feature flag before allowing the request.
 *
 * Usage:
 *   const featureGuard = require('./featureGuard');
 *   router.put('/branding', featureGuard('theme_customization'), controller.updateBranding);
 *   router.get('/export/excel', featureGuard('excel_export'), controller.exportExcel);
 *
 * Supported features: any boolean key in planLimits.js
 *   - excel_export
 *   - theme_customization
 *   - sms_notifications
 *   - custom_report_branding
 *   - multi_campus
 *   - api_access
 */
const db = require('../config/db');
const { getLimits } = require('../config/planLimits');

const featureGuard = (featureKey) => {
  return async (req, res, next) => {
    try {
      // SUPER_ADMIN bypasses
      if (req.user?.role === 'SUPER_ADMIN') return next();

      const schoolId = req.schoolId;
      if (!schoolId) return next();

      // Get school plan
      const schoolRes = await db.query(
        'SELECT plan_type FROM schools WHERE id = $1',
        [schoolId]
      );
      if (schoolRes.rows.length === 0) return next();

      const plan = schoolRes.rows[0].plan_type || 'starter';
      const limits = getLimits(plan);
      const allowed = limits[featureKey];

      if (!allowed) {
        const featureLabel = featureKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        return res.status(403).json({
          success: false,
          code: 'FEATURE_NOT_AVAILABLE',
          message: `${featureLabel} is not available on the ${limits.label} plan. Please upgrade to access this feature.`,
          feature: featureKey,
          plan,
          required_plan: getMinimumPlan(featureKey),
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Helper: find the minimum plan that enables a given feature.
 */
function getMinimumPlan(featureKey) {
  const { PLAN_LIMITS } = require('../config/planLimits');
  for (const planName of ['starter', 'standard', 'pro']) {
    if (PLAN_LIMITS[planName][featureKey]) return planName;
  }
  return 'pro';
}

module.exports = featureGuard;

