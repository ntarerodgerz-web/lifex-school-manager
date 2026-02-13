const db = require('../../config/db');

const create = async (data) => {
  const result = await db.query(
    `INSERT INTO broadcasts (title, message, target, target_school_id, posted_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [data.title, data.message, data.target || 'all',
     data.target_school_id || null, data.posted_by || null]
  );
  return result.rows[0];
};

/**
 * List broadcasts visible to the current user.
 * - SUPER_ADMIN sees all broadcasts
 * - SCHOOL_ADMIN sees broadcasts targeting 'all' or 'school_admins' or their specific school
 * - TEACHER sees 'all' or 'teachers' or their school
 * - PARENT sees 'all' or 'parents' or their school
 */
const findForUser = async (userRole, schoolId, { page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;

  if (userRole === 'SUPER_ADMIN') {
    // Super admin sees everything
    const result = await db.query(
      `SELECT b.*, u.first_name || ' ' || u.last_name as posted_by_name,
              s.name as target_school_name
       FROM broadcasts b
       LEFT JOIN users u ON b.posted_by = u.id
       LEFT JOIN schools s ON b.target_school_id = s.id
       WHERE b.is_active = true
       ORDER BY b.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  // Other roles: see broadcasts that target 'all', their role group, or their specific school
  const roleTarget = userRole === 'SCHOOL_ADMIN' ? 'school_admins'
    : userRole === 'TEACHER' ? 'teachers'
    : userRole === 'PARENT' ? 'parents'
    : null;

  let query = `SELECT b.*, u.first_name || ' ' || u.last_name as posted_by_name
       FROM broadcasts b
       LEFT JOIN users u ON b.posted_by = u.id
       WHERE b.is_active = true AND (
         b.target = 'all'`;
  const params = [];
  let idx = 1;

  if (roleTarget) {
    params.push(roleTarget);
    query += ` OR b.target = $${idx}`;
    idx++;
  }

  if (schoolId) {
    params.push(schoolId);
    query += ` OR b.target_school_id = $${idx}`;
    idx++;
  }

  query += `)`;
  query += ` ORDER BY b.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
};

const findById = async (id) => {
  const result = await db.query(
    `SELECT b.*, u.first_name || ' ' || u.last_name as posted_by_name
     FROM broadcasts b LEFT JOIN users u ON b.posted_by = u.id
     WHERE b.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  await db.query(`UPDATE broadcasts SET is_active = false, updated_at = NOW() WHERE id = $1`, [id]);
  return { id };
};

module.exports = { create, findForUser, findById, remove };

