/**
 * Plan Feature Limits
 * ─────────────────────────────────────────
 * Defines what each subscription plan can do.
 * Used by both the backend (enforcement) and returned to the frontend via API.
 */

const PLAN_LIMITS = {
  starter: {
    label: 'Starter (Trial)',
    max_pupils: 100,
    max_teachers: 5,
    max_classes: 5,
    max_parents: 50,
    pdf_export: true,
    excel_export: false,
    theme_customization: false,
    sms_notifications: false,
    custom_report_branding: false,
    multi_campus: false,
    api_access: false,
  },
  standard: {
    label: 'Standard',
    max_pupils: 500,
    max_teachers: -1,   // unlimited
    max_classes: -1,
    max_parents: -1,
    pdf_export: true,
    excel_export: true,
    theme_customization: true,
    sms_notifications: false,
    custom_report_branding: true,
    multi_campus: false,
    api_access: false,
  },
  pro: {
    label: 'Pro',
    max_pupils: -1,     // unlimited
    max_teachers: -1,
    max_classes: -1,
    max_parents: -1,
    pdf_export: true,
    excel_export: true,
    theme_customization: true,
    sms_notifications: true,
    custom_report_branding: true,
    multi_campus: true,
    api_access: true,
  },
};

/**
 * Get the limits object for a given plan.
 * Falls back to 'starter' for unknown plan types.
 */
const getLimits = (planType) => {
  return PLAN_LIMITS[planType] || PLAN_LIMITS.starter;
};

module.exports = { PLAN_LIMITS, getLimits };

