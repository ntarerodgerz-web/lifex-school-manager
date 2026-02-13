const db = require('../../config/db');

/* ─── Subject CRUD ─── */

const create = async (data) => {
  const result = await db.query(
    `INSERT INTO subjects (school_id, name, code, description) VALUES ($1,$2,$3,$4) RETURNING *`,
    [data.school_id, data.name, data.code || null, data.description || null]
  );
  return result.rows[0];
};

const findBySchool = async (schoolId) => {
  const result = await db.query(
    `SELECT s.*,
       (SELECT COUNT(*) FROM teacher_subjects ts WHERE ts.subject_id = s.id) as teacher_count
     FROM subjects s
     WHERE s.school_id = $1 AND s.is_active = true
     ORDER BY s.name`,
    [schoolId]
  );
  return result.rows;
};

const findById = async (id, schoolId) => {
  const result = await db.query(
    `SELECT * FROM subjects WHERE id = $1 AND school_id = $2`, [id, schoolId]
  );
  return result.rows[0] || null;
};

const update = async (id, schoolId, data) => {
  const fields = []; const values = []; let idx = 1;
  for (const key of ['name', 'code', 'description', 'is_active']) {
    if (data[key] !== undefined) { fields.push(`${key} = $${idx}`); values.push(data[key]); idx++; }
  }
  if (fields.length === 0) return findById(id, schoolId);
  fields.push('updated_at = NOW()');
  values.push(id, schoolId);
  const result = await db.query(
    `UPDATE subjects SET ${fields.join(', ')} WHERE id = $${idx} AND school_id = $${idx + 1} RETURNING *`, values
  );
  return result.rows[0];
};

const remove = async (id, schoolId) => {
  const result = await db.query(
    `UPDATE subjects SET is_active = false, updated_at = NOW() WHERE id = $1 AND school_id = $2 RETURNING id`,
    [id, schoolId]
  );
  return result.rows[0];
};

/* ─── Teacher-Subject Assignments ─── */

/**
 * Assign a teacher to a subject (optionally for a specific class).
 */
const assignTeacher = async (schoolId, teacherId, subjectId, classId) => {
  const result = await db.query(
    `INSERT INTO teacher_subjects (school_id, teacher_id, subject_id, class_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (teacher_id, subject_id, class_id) DO NOTHING
     RETURNING *`,
    [schoolId, teacherId, subjectId, classId || null]
  );
  return result.rows[0];
};

/**
 * Remove a teacher-subject assignment.
 */
const unassignTeacher = async (id, schoolId) => {
  const result = await db.query(
    `DELETE FROM teacher_subjects WHERE id = $1 AND school_id = $2 RETURNING id`,
    [id, schoolId]
  );
  return result.rows[0];
};

/**
 * Get all assignments for a specific subject.
 */
const getAssignmentsForSubject = async (subjectId, schoolId) => {
  const result = await db.query(
    `SELECT ts.id as assignment_id, ts.teacher_id, ts.class_id,
            u.first_name, u.last_name, t.employee_number,
            c.name as class_name
     FROM teacher_subjects ts
     JOIN teachers t ON ts.teacher_id = t.id
     JOIN users u ON t.user_id = u.id
     LEFT JOIN classes c ON ts.class_id = c.id
     WHERE ts.subject_id = $1 AND ts.school_id = $2
     ORDER BY u.first_name`,
    [subjectId, schoolId]
  );
  return result.rows;
};

/**
 * Get all assignments for a specific teacher.
 */
const getAssignmentsForTeacher = async (teacherId, schoolId) => {
  const result = await db.query(
    `SELECT ts.id as assignment_id, ts.subject_id, ts.class_id,
            s.name as subject_name, s.code as subject_code,
            c.name as class_name
     FROM teacher_subjects ts
     JOIN subjects s ON ts.subject_id = s.id
     LEFT JOIN classes c ON ts.class_id = c.id
     WHERE ts.teacher_id = $1 AND ts.school_id = $2
     ORDER BY s.name`,
    [teacherId, schoolId]
  );
  return result.rows;
};

/**
 * Get all subjects assigned to a class (with their teachers).
 */
const getSubjectsForClass = async (classId, schoolId) => {
  const result = await db.query(
    `SELECT ts.id as assignment_id, ts.teacher_id, ts.subject_id,
            s.name as subject_name, s.code as subject_code,
            u.first_name as teacher_first_name, u.last_name as teacher_last_name
     FROM teacher_subjects ts
     JOIN subjects s ON ts.subject_id = s.id
     JOIN teachers t ON ts.teacher_id = t.id
     JOIN users u ON t.user_id = u.id
     WHERE ts.class_id = $1 AND ts.school_id = $2
     ORDER BY s.name`,
    [classId, schoolId]
  );
  return result.rows;
};

/**
 * Get all teacher-subject assignments for the school (for listing).
 */
const getAllAssignments = async (schoolId) => {
  const result = await db.query(
    `SELECT ts.id as assignment_id, ts.teacher_id, ts.subject_id, ts.class_id,
            s.name as subject_name, s.code as subject_code,
            u.first_name as teacher_first_name, u.last_name as teacher_last_name,
            t.employee_number,
            c.name as class_name
     FROM teacher_subjects ts
     JOIN subjects s ON ts.subject_id = s.id
     JOIN teachers t ON ts.teacher_id = t.id
     JOIN users u ON t.user_id = u.id
     LEFT JOIN classes c ON ts.class_id = c.id
     WHERE ts.school_id = $1
     ORDER BY s.name, c.name, u.first_name`,
    [schoolId]
  );
  return result.rows;
};

module.exports = {
  create, findBySchool, findById, update, remove,
  assignTeacher, unassignTeacher,
  getAssignmentsForSubject, getAssignmentsForTeacher,
  getSubjectsForClass, getAllAssignments,
};
