const db = require('../../config/db');

const create = async (data) => {
  const result = await db.query(
    `INSERT INTO fees (school_id, class_id, name, amount, term, academic_year, due_date, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.school_id, data.class_id || null, data.name, data.amount, data.term || null,
     data.academic_year || null, data.due_date || null, data.description || null]
  );
  return result.rows[0];
};

const findBySchool = async (schoolId, { class_id, term, page = 1, limit = 50 } = {}) => {
  const offset = (page - 1) * limit;
  let query = `SELECT f.*, c.name as class_name FROM fees f
               LEFT JOIN classes c ON f.class_id = c.id
               WHERE f.school_id = $1 AND f.is_active = true`;
  const params = [schoolId];

  if (class_id) { params.push(class_id); query += ` AND f.class_id = $${params.length}`; }
  if (term) { params.push(term); query += ` AND f.term = $${params.length}`; }

  query += ` ORDER BY f.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
};

const findById = async (id, schoolId) => {
  const result = await db.query(
    `SELECT f.*, c.name as class_name FROM fees f
     LEFT JOIN classes c ON f.class_id = c.id
     WHERE f.id = $1 AND f.school_id = $2`, [id, schoolId]
  );
  return result.rows[0] || null;
};

const update = async (id, schoolId, data) => {
  const fields = []; const values = []; let idx = 1;
  const allowed = ['name','amount','class_id','term','academic_year','due_date','description','is_active'];
  for (const key of allowed) {
    if (data[key] !== undefined) { fields.push(`${key} = $${idx}`); values.push(data[key]); idx++; }
  }
  if (fields.length === 0) return findById(id, schoolId);
  fields.push('updated_at = NOW()');
  values.push(id, schoolId);
  const result = await db.query(
    `UPDATE fees SET ${fields.join(', ')} WHERE id = $${idx} AND school_id = $${idx + 1} RETURNING *`, values
  );
  return result.rows[0];
};

module.exports = { create, findBySchool, findById, update };

