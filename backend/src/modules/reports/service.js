/**
 * Reporting Engine – Aggregate queries for school dashboards and reports.
 * All queries are school_id-scoped.
 */
const db = require('../../config/db');

/**
 * School Dashboard Summary
 */
const schoolSummary = async (schoolId) => {
  const result = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM pupils WHERE school_id = $1 AND is_active = true) as total_pupils,
       (SELECT COUNT(*) FROM teachers WHERE school_id = $1 AND is_active = true) as total_teachers,
       (SELECT COUNT(*) FROM classes WHERE school_id = $1 AND is_active = true) as total_classes,
       (SELECT COUNT(*) FROM parents WHERE school_id = $1) as total_parents,
       (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE school_id = $1) as total_fees_collected,
       (SELECT COALESCE(SUM(f.amount), 0) FROM fees f WHERE f.school_id = $1 AND f.is_active = true) as total_fees_expected`,
    [schoolId]
  );
  return result.rows[0];
};

/**
 * Attendance report for a date range
 */
const attendanceReport = async (schoolId, { from, to, class_id }) => {
  let query = `SELECT
       a.date,
       c.name as class_name,
       COUNT(*) FILTER (WHERE a.status = 'present') as present,
       COUNT(*) FILTER (WHERE a.status = 'absent') as absent,
       COUNT(*) FILTER (WHERE a.status = 'late') as late,
       COUNT(*) as total
     FROM attendance a
     JOIN classes c ON a.class_id = c.id
     WHERE a.school_id = $1`;
  const params = [schoolId];

  if (from) { params.push(from); query += ` AND a.date >= $${params.length}`; }
  if (to) { params.push(to); query += ` AND a.date <= $${params.length}`; }
  if (class_id) { params.push(class_id); query += ` AND a.class_id = $${params.length}`; }

  query += ` GROUP BY a.date, c.name ORDER BY a.date DESC`;
  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Financial report
 */
const financialReport = async (schoolId, { from, to }) => {
  let paymentQuery = `SELECT
       DATE_TRUNC('month', payment_date) as month,
       SUM(amount) as total_collected,
       COUNT(*) as payment_count,
       payment_method
     FROM payments WHERE school_id = $1`;
  const params = [schoolId];

  if (from) { params.push(from); paymentQuery += ` AND payment_date >= $${params.length}`; }
  if (to) { params.push(to); paymentQuery += ` AND payment_date <= $${params.length}`; }

  paymentQuery += ` GROUP BY month, payment_method ORDER BY month DESC`;
  const result = await db.query(paymentQuery, params);
  return result.rows;
};

/**
 * Enrollment report (pupils by class)
 */
const enrollmentReport = async (schoolId) => {
  const result = await db.query(
    `SELECT c.name as class_name, c.capacity,
       COUNT(p.id) as enrolled,
       COUNT(p.id) FILTER (WHERE p.gender = 'Male') as male,
       COUNT(p.id) FILTER (WHERE p.gender = 'Female') as female
     FROM classes c
     LEFT JOIN pupils p ON p.class_id = c.id AND p.is_active = true
     WHERE c.school_id = $1 AND c.is_active = true
     GROUP BY c.id, c.name, c.capacity
     ORDER BY c.name`,
    [schoolId]
  );
  return result.rows;
};

/**
 * Teacher summary report
 */
const teacherSummaryReport = async (schoolId) => {
  const result = await db.query(
    `SELECT t.id, u.first_name, u.last_name, t.qualification, t.employee_number,
       (SELECT COUNT(*) FROM classes c WHERE c.teacher_id = t.user_id AND c.school_id = $1) as classes_assigned,
       (SELECT COUNT(*) FROM teacher_subjects ts WHERE ts.teacher_id = t.id AND ts.school_id = $1) as subjects_assigned
     FROM teachers t
     JOIN users u ON t.user_id = u.id
     WHERE t.school_id = $1 AND t.is_active = true
     ORDER BY u.first_name`,
    [schoolId]
  );
  return result.rows;
};

/**
 * School Profile report – school info + admin users
 */
const schoolProfileReport = async (schoolId) => {
  const schoolResult = await db.query(
    `SELECT s.id, s.name, s.motto, s.address, s.district, s.region, s.country,
            s.phone, s.email, s.logo_url, s.badge_url,
            s.subscription_status, s.plan_type,
            s.trial_ends_at, s.subscription_expires_at,
            s.is_active, s.created_at
     FROM schools s WHERE s.id = $1`,
    [schoolId]
  );
  const school = schoolResult.rows[0] || null;

  const adminsResult = await db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
            u.avatar_url, u.is_active, u.last_login, u.created_at
     FROM users u
     WHERE u.school_id = $1 AND u.role = 'SCHOOL_ADMIN' AND u.is_active = true
     ORDER BY u.created_at`,
    [schoolId]
  );

  // Quick stats for context
  const statsResult = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM pupils WHERE school_id = $1 AND is_active = true) as total_pupils,
       (SELECT COUNT(*) FROM teachers WHERE school_id = $1 AND is_active = true) as total_teachers,
       (SELECT COUNT(*) FROM classes WHERE school_id = $1 AND is_active = true) as total_classes,
       (SELECT COUNT(*) FROM parents WHERE school_id = $1) as total_parents`,
    [schoolId]
  );

  return {
    school,
    admins: adminsResult.rows,
    stats: statsResult.rows[0] || {},
  };
};

module.exports = {
  schoolSummary,
  attendanceReport,
  financialReport,
  enrollmentReport,
  teacherSummaryReport,
  schoolProfileReport,
};

