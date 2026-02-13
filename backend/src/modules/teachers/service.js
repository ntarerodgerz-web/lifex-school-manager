const bcrypt = require('bcrypt');
const db = require('../../config/db');
const teacherModel = require('./model');

const SALT_ROUNDS = 12;

/**
 * Create a teacher: creates user record + teacher record in a transaction
 */
const createTeacher = async (schoolId, data) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(data.password || 'Teacher@123', SALT_ROUNDS);

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (school_id, first_name, last_name, email, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,$5,$6,'TEACHER')
       RETURNING id, first_name, last_name, email, phone`,
      [schoolId, data.first_name, data.last_name, data.email || null, data.phone || null, passwordHash]
    );
    const user = userResult.rows[0];

    // Create teacher profile
    const teacherResult = await client.query(
      `INSERT INTO teachers (school_id, user_id, employee_number, qualification, specialization, date_joined, nin, salary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        schoolId, user.id,
        data.employee_number || null, data.qualification || null,
        data.specialization || null, data.date_joined || null,
        data.nin || null, data.salary || 0,
      ]
    );

    await client.query('COMMIT');

    return { ...teacherResult.rows[0], ...user };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const listTeachers = async (schoolId, query) => {
  return teacherModel.findBySchool(schoolId, query);
};

const getTeacher = async (id, schoolId) => {
  const teacher = await teacherModel.findById(id, schoolId);
  if (!teacher) {
    const err = new Error('Teacher not found.');
    err.statusCode = 404;
    throw err;
  }
  teacher.assignments = await teacherModel.getAssignments(id, schoolId);
  return teacher;
};

const updateTeacher = async (id, schoolId, data) => {
  // If user-level fields are being updated, update user table too
  const userFields = {};
  const teacherFields = {};

  ['first_name','last_name','email','phone'].forEach(k => {
    if (data[k] !== undefined) userFields[k] = data[k];
  });
  ['employee_number','qualification','specialization','date_joined','nin','salary','is_active'].forEach(k => {
    if (data[k] !== undefined) teacherFields[k] = data[k];
  });

  const teacher = await teacherModel.findById(id, schoolId);
  if (!teacher) {
    const err = new Error('Teacher not found.');
    err.statusCode = 404;
    throw err;
  }

  // Update user fields if any
  if (Object.keys(userFields).length > 0) {
    const sets = [];
    const vals = [];
    let i = 1;
    for (const [k, v] of Object.entries(userFields)) {
      sets.push(`${k} = $${i}`);
      vals.push(v);
      i++;
    }
    sets.push('updated_at = NOW()');
    vals.push(teacher.user_id);
    await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, vals);
  }

  // Update teacher fields
  if (Object.keys(teacherFields).length > 0) {
    return teacherModel.update(id, schoolId, teacherFields);
  }

  return teacherModel.findById(id, schoolId);
};

const deleteTeacher = async (id, schoolId) => {
  const teacher = await teacherModel.findById(id, schoolId);
  if (!teacher) {
    const err = new Error('Teacher not found.');
    err.statusCode = 404;
    throw err;
  }
  return teacherModel.remove(id, schoolId);
};

module.exports = { createTeacher, listTeachers, getTeacher, updateTeacher, deleteTeacher };

