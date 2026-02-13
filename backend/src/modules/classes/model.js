const db = require('../../config/db');

const create = async (data) => {
  const result = await db.query(
    `INSERT INTO classes (school_id, name, section, capacity, teacher_id, academic_year)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.school_id, data.name, data.section || null, data.capacity || 40, data.teacher_id || null, data.academic_year || null]
  );
  return result.rows[0];
};

const findBySchool = async (schoolId, { page = 1, limit = 50, search }) => {
  const offset = (page - 1) * limit;
  let query = `SELECT c.*, u.first_name || ' ' || u.last_name as teacher_name,
               (SELECT COUNT(*) FROM pupils p WHERE p.class_id = c.id AND p.is_active = true) as pupil_count
               FROM classes c
               LEFT JOIN users u ON c.teacher_id = u.id
               WHERE c.school_id = $1 AND c.is_active = true`;
  const params = [schoolId];

  if (search) {
    params.push(`%${search}%`);
    query += ` AND c.name ILIKE $${params.length}`;
  }

  query += ` ORDER BY c.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
};

const findById = async (id, schoolId) => {
  const result = await db.query(
    `SELECT c.*, u.first_name || ' ' || u.last_name as teacher_name
     FROM classes c
     LEFT JOIN users u ON c.teacher_id = u.id
     WHERE c.id = $1 AND c.school_id = $2`,
    [id, schoolId]
  );
  return result.rows[0] || null;
};

const update = async (id, schoolId, data) => {
  const fields = [];
  const values = [];
  let idx = 1;

  const allowed = ['name', 'section', 'capacity', 'teacher_id', 'academic_year', 'is_active'];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(data[key]);
      idx++;
    }
  }
  if (fields.length === 0) return findById(id, schoolId);

  fields.push('updated_at = NOW()');
  values.push(id, schoolId);

  const result = await db.query(
    `UPDATE classes SET ${fields.join(', ')} WHERE id = $${idx} AND school_id = $${idx + 1} RETURNING *`,
    values
  );
  return result.rows[0];
};

const remove = async (id, schoolId) => {
  const result = await db.query(
    `UPDATE classes SET is_active = false, updated_at = NOW() WHERE id = $1 AND school_id = $2 RETURNING id`,
    [id, schoolId]
  );
  return result.rows[0];
};

module.exports = { create, findBySchool, findById, update, remove };

