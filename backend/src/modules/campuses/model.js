const db = require('../../config/db');

/**
 * Create a new campus for a school.
 */
const create = async (data) => {
  const result = await db.query(
    `INSERT INTO campuses (school_id, name, code, address, district, region, phone, email, is_main)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      data.school_id, data.name, data.code || null,
      data.address || null, data.district || null, data.region || null,
      data.phone || null, data.email || null, data.is_main || false,
    ]
  );
  return result.rows[0];
};

/**
 * Find all campuses for a school.
 */
const findBySchool = async (schoolId) => {
  const result = await db.query(
    `SELECT c.*,
       (SELECT COUNT(*)::int FROM classes WHERE campus_id = c.id AND is_active = true) as class_count,
       (SELECT COUNT(*)::int FROM pupils p JOIN classes cl ON p.class_id = cl.id WHERE cl.campus_id = c.id AND p.is_active = true) as pupil_count
     FROM campuses c
     WHERE c.school_id = $1 AND c.is_active = true
     ORDER BY c.is_main DESC, c.name`,
    [schoolId]
  );
  return result.rows;
};

/**
 * Find a campus by ID (within a school).
 */
const findById = async (id, schoolId) => {
  const result = await db.query(
    `SELECT * FROM campuses WHERE id = $1 AND school_id = $2`,
    [id, schoolId]
  );
  return result.rows[0];
};

/**
 * Update a campus.
 */
const update = async (id, schoolId, data) => {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const [key, val] of Object.entries(data)) {
    if (['name', 'code', 'address', 'district', 'region', 'phone', 'email', 'is_main'].includes(key)) {
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }
  }
  if (fields.length === 0) return findById(id, schoolId);

  fields.push(`updated_at = NOW()`);
  values.push(id, schoolId);

  const result = await db.query(
    `UPDATE campuses SET ${fields.join(', ')} WHERE id = $${idx++} AND school_id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
};

/**
 * Soft-delete a campus.
 */
const remove = async (id, schoolId) => {
  const result = await db.query(
    `UPDATE campuses SET is_active = false, updated_at = NOW() WHERE id = $1 AND school_id = $2 RETURNING id, name`,
    [id, schoolId]
  );
  return result.rows[0];
};

module.exports = { create, findBySchool, findById, update, remove };

