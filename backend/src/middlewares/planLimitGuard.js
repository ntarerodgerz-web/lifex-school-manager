/**
 * Plan Limit Guard Middleware Factory
 * ─────────────────────────────────────────────────────────
 * Checks whether a school has exceeded the record limit for
 * its current plan before allowing creation of new records.
 *
 * Usage:
 *   const planLimitGuard = require('./planLimitGuard');
 *   router.post('/', planLimitGuard('pupils'), validate(...), c.create);
 *
 * Supported entities: 'pupils', 'teachers', 'classes', 'parents'
 */
const db = require('../config/db');
const { getLimits } = require('../config/planLimits');

const TABLE_MAP = {
  pupils: { table: 'pupils', limitKey: 'max_pupils' },
  teachers: { table: 'teachers', limitKey: 'max_teachers' },
  classes: { table: 'classes', limitKey: 'max_classes' },
  parents: { table: 'parents', limitKey: 'max_parents' },
};

const planLimitGuard = (entity) => {
  const config = TABLE_MAP[entity];
  if (!config) throw new Error(`planLimitGuard: unknown entity "${entity}"`);

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
      const maxAllowed = limits[config.limitKey];

      // -1 = unlimited
      if (maxAllowed === -1) return next();

      // Count existing active records
      const countRes = await db.query(
        `SELECT COUNT(*)::int as cnt FROM ${config.table} WHERE school_id = $1 AND is_active = true`,
        [schoolId]
      );
      const currentCount = countRes.rows[0].cnt;

      if (currentCount >= maxAllowed) {
        return res.status(403).json({
          success: false,
          code: 'PLAN_LIMIT_REACHED',
          message: `You have reached the maximum number of ${entity} (${maxAllowed}) allowed on the ${limits.label} plan. Please upgrade your plan to add more.`,
          entity,
          current: currentCount,
          limit: maxAllowed,
          plan,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = planLimitGuard;

