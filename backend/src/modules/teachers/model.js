const db = require('../../config/db');

const create = async (data) => {
  const result = await db.query(
    `INSERT INTO teachers (school_id, user_id, employee_number, qualification, specialization, date_joined, nin, salary)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      data.school_id, data.user_id,
      data.employee_number || null, data.qualification || null,
      data.specialization || null, data.date_joined || null,
      data.nin || null, data.salary || 0,
    ]
  );
  return result.rows[0];
};

const findBySchool = async (schoolId, { page = 1, limit = 50, search }) => {
  const offset = (page - 1) * limit;
  let query = `SELECT t.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url, u.is_active as user_active
               FROM teachers t
               JOIN users u ON t.user_id = u.id
               WHERE t.school_id = $1 AND t.is_active = true`;
  const params = [schoolId];

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR t.employee_number ILIKE $${params.length})`;
  }

  query += ` ORDER BY u.first_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
};

const findById = async (id, schoolId) => {
  const result = await db.query(
    `SELECT t.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url
     FROM teachers t
     JOIN users u ON t.user_id = u.id
     WHERE t.id = $1 AND t.school_id = $2`,
    [id, schoolId]
  );
  return result.rows[0] || null;
};

const findByUserId = async (userId, schoolId) => {
  const result = await db.query(
    `SELECT t.*, u.first_name, u.last_name, u.email, u.phone
     FROM teachers t
     JOIN users u ON t.user_id = u.id
     WHERE t.user_id = $1 AND t.school_id = $2`,
    [userId, schoolId]
  );
  return result.rows[0] || null;
};

const update = async (id, schoolId, data) => {
  const fields = [];
  const values = [];
  let idx = 1;

  const allowed = ['employee_number','qualification','specialization','date_joined','nin','salary','is_active'];
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
    `UPDATE teachers SET ${fields.join(', ')} WHERE id = $${idx} AND school_id = $${idx + 1} RETURNING *`,
    values
  );
  return result.rows[0];
};

/**
 * Get classes and subjects assigned to a teacher
 */
const getAssignments = async (teacherId, schoolId) => {
  const result = await db.query(
    `SELECT ts.id, s.name as subject_name, s.code as subject_code, c.name as class_name, c.id as class_id
     FROM teacher_subjects ts
     JOIN subjects s ON ts.subject_id = s.id
     LEFT JOIN classes c ON ts.class_id = c.id
     WHERE ts.teacher_id = $1 AND ts.school_id = $2`,
    [teacherId, schoolId]
  );
  return result.rows;
};

const remove = async (id, schoolId) => {
  // Soft-delete: set teacher is_active = false and deactivate user account
  const teacher = await findById(id, schoolId);
  if (!teacher) return null;

  await db.query(
    `UPDATE teachers SET is_active = false, updated_at = NOW() WHERE id = $1 AND school_id = $2`,
    [id, schoolId]
  );
  await db.query(
    `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
    [teacher.user_id]
  );
  return { id };
};

module.exports = { create, findBySchool, findById, findByUserId, update, getAssignments, remove };

