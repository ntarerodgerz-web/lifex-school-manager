/**
 * Subscription Guard Middleware
 * ---------------------------------------------------------------------------
 * Blocks access when a school's subscription / trial has expired.
 *
 * Behaviour:
 *  - SUPER_ADMIN  →  always allowed (platform admin)
 *  - Trial active →  allowed
 *  - Trial expired →  auto-marks school as 'expired', returns 403
 *  - Active subscription →  allowed
 *  - Expired subscription →  7-day grace period, then 403
 *  - Suspended  →  403 immediately
 *
 * Returns a structured JSON body so the frontend can show the right paywall.
 * ---------------------------------------------------------------------------
 */
const db = require('../config/db');
const { error } = require('../utils/response');

const GRACE_DAYS = 7;

const subscriptionGuard = async (req, res, next) => {
  try {
    // SUPER_ADMIN bypasses subscription checks
    if (req.user && req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const schoolId = req.schoolId;
    if (!schoolId) return next(); // schoolIsolation handles missing school

    const result = await db.query(
      `SELECT subscription_status, plan_type, subscription_expires_at, trial_ends_at
       FROM schools WHERE id = $1`,
      [schoolId]
    );

    if (result.rows.length === 0) {
      return error(res, { statusCode: 404, message: 'School not found.' });
    }

    const school = result.rows[0];
    const now = new Date();

    // ─── TRIAL ────────────────────────────────────────────────
    if (school.subscription_status === 'trial') {
      const trialEnd = school.trial_ends_at ? new Date(school.trial_ends_at) : null;

      if (trialEnd && trialEnd < now) {
        // Auto-mark school as expired (lazy – no cron needed)
        await db.query(
          `UPDATE schools SET subscription_status = 'expired', updated_at = NOW() WHERE id = $1`,
          [schoolId]
        );
        return res.status(403).json({
          success: false,
          code: 'TRIAL_EXPIRED',
          message: 'Your 30-day free trial has ended. Please subscribe to continue using the system.',
          trial_ends_at: school.trial_ends_at,
        });
      }

      // Trial still active – attach days remaining for frontend banner
      if (trialEnd) {
        const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        res.set('X-Trial-Days-Left', String(daysLeft));
      }
      return next();
    }

    // ─── SUSPENDED ────────────────────────────────────────────
    if (school.subscription_status === 'suspended') {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_SUSPENDED',
        message: 'Your subscription has been suspended. Please contact support.',
      });
    }

    // ─── ACTIVE SUBSCRIPTION ──────────────────────────────────
    if (school.subscription_status === 'active') {
      const expiresAt = school.subscription_expires_at ? new Date(school.subscription_expires_at) : null;

      if (expiresAt && expiresAt < now) {
        // Auto-mark as expired
        await db.query(
          `UPDATE schools SET subscription_status = 'expired', updated_at = NOW() WHERE id = $1`,
          [schoolId]
        );
        // Fall through to expired check below
        school.subscription_status = 'expired';
      } else {
        // Still active
        if (expiresAt) {
          const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
          res.set('X-Subscription-Days-Left', String(daysLeft));
        }
        return next();
      }
    }

    // ─── EXPIRED (with grace period) ──────────────────────────
    if (school.subscription_status === 'expired') {
      const expiryDate = new Date(
        school.subscription_expires_at || school.trial_ends_at || now
      );
      const graceEnd = new Date(expiryDate);
      graceEnd.setDate(graceEnd.getDate() + GRACE_DAYS);

      if (now > graceEnd) {
        return res.status(403).json({
          success: false,
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Your subscription has expired. Please renew to continue using the system.',
          expired_at: expiryDate.toISOString(),
          grace_ended_at: graceEnd.toISOString(),
        });
      }

      // Within grace period – let them through but warn
      const graceDaysLeft = Math.ceil((graceEnd - now) / (1000 * 60 * 60 * 24));
      res.set('X-Grace-Days-Left', String(graceDaysLeft));
      return next();
    }

    // Unknown status – allow (safe default)
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = subscriptionGuard;

