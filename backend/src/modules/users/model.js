const db = require('../../config/db');

const create = async (data) => {
  const result = await db.query(
    `INSERT INTO users (school_id, first_name, last_name, email, phone, password_hash, role, avatar_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, school_id, first_name, last_name, email, phone, role, avatar_url, is_active, created_at`,
    [
      data.school_id, data.first_name, data.last_name,
      data.email || null, data.phone || null,
      data.password_hash, data.role, data.avatar_url || null,
    ]
  );
  return result.rows[0];
};

const findBySchool = async (schoolId, { role, page = 1, limit = 50, search }) => {
  const offset = (page - 1) * limit;
  let query = `SELECT id, school_id, first_name, last_name, email, phone, role, avatar_url, is_active, last_login, created_at
               FROM users WHERE school_id = $1`;
  const params = [schoolId];

  if (role) {
    params.push(role);
    query += ` AND role = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
  }

  const countParams = [...params];
  const countQuery = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) FROM');

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const [dataResult, countResult] = await Promise.all([
    db.query(query, params),
    db.query(countQuery, countParams),
  ]);

  return {
    users: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
    page,
    limit,
  };
};

const findById = async (id, schoolId) => {
  const result = await db.query(
    `SELECT id, school_id, first_name, last_name, email, phone, role, avatar_url, is_active, last_login, created_at
     FROM users WHERE id = $1 AND school_id = $2`,
    [id, schoolId]
  );
  return result.rows[0] || null;
};

const update = async (id, schoolId, data) => {
  const fields = [];
  const values = [];
  let idx = 1;

  const allowed = ['first_name', 'last_name', 'email', 'phone', 'avatar_url', 'is_active'];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(data[key]);
      idx++;
    }
  }

  if (fields.length === 0) return findById(id, schoolId);

  fields.push(`updated_at = NOW()`);
  values.push(id, schoolId);

  const result = await db.query(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${idx} AND school_id = $${idx + 1}
     RETURNING id, school_id, first_name, last_name, email, phone, role, avatar_url, is_active, created_at`,
    values
  );
  return result.rows[0];
};

const deactivate = async (id, schoolId) => {
  const result = await db.query(
    `UPDATE users SET is_active = false, updated_at = NOW()
     WHERE id = $1 AND school_id = $2
     RETURNING id, is_active`,
    [id, schoolId]
  );
  return result.rows[0];
};

module.exports = { create, findBySchool, findById, update, deactivate };

