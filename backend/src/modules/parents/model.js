const db = require('../../config/db');

const create = async (data) => {
  const result = await db.query(
    `INSERT INTO parents (school_id, user_id, occupation, address, relationship)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [data.school_id, data.user_id, data.occupation || null, data.address || null, data.relationship || 'Parent']
  );
  return result.rows[0];
};

const findBySchool = async (schoolId, { page = 1, limit = 50, search }) => {
  const offset = (page - 1) * limit;
  let query = `SELECT pa.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
               (SELECT COUNT(*) FROM pupil_parents pp WHERE pp.parent_id = pa.id) as children_count
               FROM parents pa
               JOIN users u ON pa.user_id = u.id
               WHERE pa.school_id = $1`;
  const params = [schoolId];

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.phone ILIKE $${params.length})`;
  }

  query += ` ORDER BY u.first_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
};

const findById = async (id, schoolId) => {
  const result = await db.query(
    `SELECT pa.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url
     FROM parents pa
     JOIN users u ON pa.user_id = u.id
     WHERE pa.id = $1 AND pa.school_id = $2`,
    [id, schoolId]
  );
  return result.rows[0] || null;
};

const findByUserId = async (userId, schoolId) => {
  const result = await db.query(
    `SELECT pa.*, u.first_name, u.last_name, u.email, u.phone
     FROM parents pa
     JOIN users u ON pa.user_id = u.id
     WHERE pa.user_id = $1 AND pa.school_id = $2`,
    [userId, schoolId]
  );
  return result.rows[0] || null;
};

/**
 * Get children of a parent
 */
const getChildren = async (parentId, schoolId) => {
  const result = await db.query(
    `SELECT p.*, c.name as class_name, pp.is_primary
     FROM pupil_parents pp
     JOIN pupils p ON pp.pupil_id = p.id
     LEFT JOIN classes c ON p.class_id = c.id
     WHERE pp.parent_id = $1 AND pp.school_id = $2 AND p.is_active = true`,
    [parentId, schoolId]
  );
  return result.rows;
};

const linkChild = async (schoolId, parentId, pupilId, isPrimary = false) => {
  const result = await db.query(
    `INSERT INTO pupil_parents (school_id, pupil_id, parent_id, is_primary)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (pupil_id, parent_id) DO UPDATE SET is_primary = $4
     RETURNING *`,
    [schoolId, pupilId, parentId, isPrimary]
  );
  return result.rows[0];
};

const remove = async (id, schoolId) => {
  const parent = await findById(id, schoolId);
  if (!parent) return null;

  // Remove pupil-parent links
  await db.query(`DELETE FROM pupil_parents WHERE parent_id = $1 AND school_id = $2`, [id, schoolId]);
  // Soft-delete parent record
  await db.query(`DELETE FROM parents WHERE id = $1 AND school_id = $2`, [id, schoolId]);
  // Deactivate user account
  await db.query(`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`, [parent.user_id]);
  return { id };
};

module.exports = { create, findBySchool, findById, findByUserId, getChildren, linkChild, remove };

