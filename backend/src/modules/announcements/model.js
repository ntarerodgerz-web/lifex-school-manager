const db = require('../../config/db');

const create = async (data) => {
  const result = await db.query(
    `INSERT INTO announcements (school_id, title, body, audience, target_class_id, posted_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.school_id, data.title, data.body, data.audience || 'all',
     data.target_class_id || null, data.posted_by || null]
  );
  return result.rows[0];
};

const findBySchool = async (schoolId, { audience, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  let query = `SELECT a.*, u.first_name || ' ' || u.last_name as posted_by_name
               FROM announcements a
               LEFT JOIN users u ON a.posted_by = u.id
               WHERE a.school_id = $1 AND a.is_active = true`;
  const params = [schoolId];

  if (audience) { params.push(audience); query += ` AND a.audience = $${params.length}`; }

  query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
};

const findById = async (id, schoolId) => {
  const result = await db.query(
    `SELECT a.*, u.first_name || ' ' || u.last_name as posted_by_name
     FROM announcements a LEFT JOIN users u ON a.posted_by = u.id
     WHERE a.id = $1 AND a.school_id = $2`, [id, schoolId]
  );
  return result.rows[0] || null;
};

const update = async (id, schoolId, data) => {
  const fields = []; const values = []; let idx = 1;
  for (const key of ['title','body','audience','target_class_id','is_active']) {
    if (data[key] !== undefined) { fields.push(`${key} = $${idx}`); values.push(data[key]); idx++; }
  }
  if (fields.length === 0) return findById(id, schoolId);
  fields.push('updated_at = NOW()');
  values.push(id, schoolId);
  const result = await db.query(
    `UPDATE announcements SET ${fields.join(', ')} WHERE id = $${idx} AND school_id = $${idx + 1} RETURNING *`, values
  );
  return result.rows[0];
};

module.exports = { create, findBySchool, findById, update };

