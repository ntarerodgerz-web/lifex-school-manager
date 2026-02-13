/**
 * External API Routes (authenticated via API key)
 * ─────────────────────────────────────────────
 * These routes are for Pro plan schools to access their data
 * programmatically via API keys (X-API-Key header).
 *
 * Base path: /api/v1/external
 *
 * Available endpoints:
 *   GET /external/pupils         — List pupils
 *   GET /external/teachers       — List teachers
 *   GET /external/classes        — List classes
 *   GET /external/attendance     — Get attendance records
 *   GET /external/assessments    — Get assessment/grade records
 *   GET /external/fees           — List fee structures
 *   GET /external/payments       — List payments
 *   GET /external/school         — Get school info
 */
const router = require('express').Router();
const apiKeyAuth = require('../../middlewares/apiKeyAuth');
const apiRateLimiter = require('../../middlewares/apiRateLimiter');
const db = require('../../config/db');
const { success } = require('../../utils/response');

// All external routes require API key auth + rate limiting
router.use(apiKeyAuth, apiRateLimiter);

/**
 * Permission check helper
 */
const requirePermission = (permission) => (req, res, next) => {
  const permissions = req.apiKey.permissions || ['read'];
  if (!permissions.includes(permission)) {
    return res.status(403).json({
      success: false,
      message: `This API key does not have "${permission}" permission.`,
    });
  }
  next();
};

// ─── READ ENDPOINTS ───────────────────────────

router.get('/school', requirePermission('read'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, motto, address, district, region, country, phone, email, logo_url, badge_url, plan_type
       FROM schools WHERE id = $1`,
      [req.schoolId]
    );
    return success(res, { data: result.rows[0] || null });
  } catch (err) { next(err); }
});

router.get('/pupils', requirePermission('read'), async (req, res, next) => {
  try {
    const { class_id, is_active, limit = 100, offset = 0 } = req.query;
    let query = `SELECT p.*, c.name as class_name FROM pupils p LEFT JOIN classes c ON p.class_id = c.id WHERE p.school_id = $1`;
    const params = [req.schoolId];
    let idx = 2;

    if (class_id) { query += ` AND p.class_id = $${idx++}`; params.push(class_id); }
    if (is_active !== undefined) { query += ` AND p.is_active = $${idx++}`; params.push(is_active === 'true'); }

    query += ` ORDER BY p.last_name, p.first_name LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(Math.min(parseInt(limit), 500), parseInt(offset));

    const result = await db.query(query, params);
    return success(res, { data: result.rows });
  } catch (err) { next(err); }
});

router.get('/teachers', requirePermission('read'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT t.*, u.first_name, u.last_name, u.email, u.phone
       FROM teachers t JOIN users u ON t.user_id = u.id
       WHERE t.school_id = $1 AND t.is_active = true
       ORDER BY u.last_name, u.first_name`,
      [req.schoolId]
    );
    return success(res, { data: result.rows });
  } catch (err) { next(err); }
});

router.get('/classes', requirePermission('read'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.*, u.first_name || ' ' || u.last_name as teacher_name,
        (SELECT COUNT(*)::int FROM pupils WHERE class_id = c.id AND is_active = true) as pupil_count
       FROM classes c LEFT JOIN users u ON c.teacher_id = u.id
       WHERE c.school_id = $1 AND c.is_active = true
       ORDER BY c.name`,
      [req.schoolId]
    );
    return success(res, { data: result.rows });
  } catch (err) { next(err); }
});

router.get('/attendance', requirePermission('read'), async (req, res, next) => {
  try {
    const { date, class_id, pupil_id, limit = 100, offset = 0 } = req.query;
    let query = `SELECT a.*, p.first_name || ' ' || p.last_name as pupil_name
       FROM attendance a JOIN pupils p ON a.pupil_id = p.id WHERE a.school_id = $1`;
    const params = [req.schoolId];
    let idx = 2;

    if (date) { query += ` AND a.date = $${idx++}`; params.push(date); }
    if (class_id) { query += ` AND a.class_id = $${idx++}`; params.push(class_id); }
    if (pupil_id) { query += ` AND a.pupil_id = $${idx++}`; params.push(pupil_id); }

    query += ` ORDER BY a.date DESC, p.last_name LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(Math.min(parseInt(limit), 500), parseInt(offset));

    const result = await db.query(query, params);
    return success(res, { data: result.rows });
  } catch (err) { next(err); }
});

router.get('/assessments', requirePermission('read'), async (req, res, next) => {
  try {
    const { term, academic_year, class_id, subject_id, limit = 100, offset = 0 } = req.query;
    let query = `SELECT a.*, p.first_name || ' ' || p.last_name as pupil_name, s.name as subject_name
       FROM assessments a
       JOIN pupils p ON a.pupil_id = p.id
       JOIN subjects s ON a.subject_id = s.id
       WHERE a.school_id = $1`;
    const params = [req.schoolId];
    let idx = 2;

    if (term) { query += ` AND a.term = $${idx++}`; params.push(term); }
    if (academic_year) { query += ` AND a.academic_year = $${idx++}`; params.push(academic_year); }
    if (class_id) { query += ` AND a.class_id = $${idx++}`; params.push(class_id); }
    if (subject_id) { query += ` AND a.subject_id = $${idx++}`; params.push(subject_id); }

    query += ` ORDER BY p.last_name, s.name LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(Math.min(parseInt(limit), 500), parseInt(offset));

    const result = await db.query(query, params);
    return success(res, { data: result.rows });
  } catch (err) { next(err); }
});

router.get('/fees', requirePermission('read'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT f.*, c.name as class_name FROM fees f
       LEFT JOIN classes c ON f.class_id = c.id
       WHERE f.school_id = $1 AND f.is_active = true
       ORDER BY f.created_at DESC`,
      [req.schoolId]
    );
    return success(res, { data: result.rows });
  } catch (err) { next(err); }
});

router.get('/payments', requirePermission('read'), async (req, res, next) => {
  try {
    const { pupil_id, from, to, limit = 100, offset = 0 } = req.query;
    let query = `SELECT pay.*, p.first_name || ' ' || p.last_name as pupil_name, f.name as fee_name
       FROM payments pay
       JOIN pupils p ON pay.pupil_id = p.id
       LEFT JOIN fees f ON pay.fee_id = f.id
       WHERE pay.school_id = $1`;
    const params = [req.schoolId];
    let idx = 2;

    if (pupil_id) { query += ` AND pay.pupil_id = $${idx++}`; params.push(pupil_id); }
    if (from) { query += ` AND pay.payment_date >= $${idx++}`; params.push(from); }
    if (to) { query += ` AND pay.payment_date <= $${idx++}`; params.push(to); }

    query += ` ORDER BY pay.payment_date DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(Math.min(parseInt(limit), 500), parseInt(offset));

    const result = await db.query(query, params);
    return success(res, { data: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;

