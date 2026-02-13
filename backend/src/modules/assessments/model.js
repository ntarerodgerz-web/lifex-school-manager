const db = require('../../config/db');

/**
 * Create an assessment record
 */
const create = async (data) => {
  const result = await db.query(
    `INSERT INTO assessments (school_id, pupil_id, subject_id, class_id, term, academic_year, score, grade, remarks, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      data.school_id, data.pupil_id, data.subject_id, data.class_id || null,
      data.term || null, data.academic_year || null,
      data.score, data.grade || null, data.remarks || null, data.recorded_by || null,
    ]
  );
  return result.rows[0];
};

/**
 * Bulk create assessments (for entering marks for a whole class)
 */
const bulkCreate = async (schoolId, records, recordedBy) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const r of records) {
      const result = await client.query(
        `INSERT INTO assessments (school_id, pupil_id, subject_id, class_id, term, academic_year, score, grade, remarks, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [
          schoolId, r.pupil_id, r.subject_id, r.class_id || null,
          r.term || null, r.academic_year || null,
          r.score, r.grade || null, r.remarks || null, recordedBy,
        ]
      );
      if (result.rows[0]) created.push(result.rows[0]);
    }
    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Update an assessment
 */
const update = async (id, schoolId, data) => {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
  }
  if (fields.length === 0) return findById(id, schoolId);

  fields.push('updated_at = NOW()');
  values.push(id, schoolId);

  const result = await db.query(
    `UPDATE assessments SET ${fields.join(', ')} WHERE id = $${idx} AND school_id = $${idx + 1} RETURNING *`,
    values
  );
  return result.rows[0];
};

/**
 * Find assessment by ID
 */
const findById = async (id, schoolId) => {
  const result = await db.query(
    `SELECT a.*, p.first_name as pupil_first_name, p.last_name as pupil_last_name,
            s.name as subject_name, c.name as class_name
     FROM assessments a
     JOIN pupils p ON a.pupil_id = p.id
     JOIN subjects s ON a.subject_id = s.id
     LEFT JOIN classes c ON a.class_id = c.id
     WHERE a.id = $1 AND a.school_id = $2`,
    [id, schoolId]
  );
  return result.rows[0] || null;
};

/**
 * Find assessments by school with optional filters
 */
const findBySchool = async (schoolId, { class_id, subject_id, term, academic_year, pupil_id } = {}) => {
  let query = `SELECT a.*, p.first_name as pupil_first_name, p.last_name as pupil_last_name,
                      s.name as subject_name, c.name as class_name
               FROM assessments a
               JOIN pupils p ON a.pupil_id = p.id
               JOIN subjects s ON a.subject_id = s.id
               LEFT JOIN classes c ON a.class_id = c.id
               WHERE a.school_id = $1`;
  const params = [schoolId];

  if (class_id) { params.push(class_id); query += ` AND a.class_id = $${params.length}`; }
  if (subject_id) { params.push(subject_id); query += ` AND a.subject_id = $${params.length}`; }
  if (term) { params.push(term); query += ` AND a.term = $${params.length}`; }
  if (academic_year) { params.push(academic_year); query += ` AND a.academic_year = $${params.length}`; }
  if (pupil_id) { params.push(pupil_id); query += ` AND a.pupil_id = $${params.length}`; }

  query += ` ORDER BY p.first_name, p.last_name, s.name`;
  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Get a pupil's full report card: all assessments for a pupil in a given term/year
 */
const getPupilReport = async (schoolId, pupilId, { term, academic_year } = {}) => {
  let query = `SELECT a.*, s.name as subject_name, s.code as subject_code, c.name as class_name
               FROM assessments a
               JOIN subjects s ON a.subject_id = s.id
               LEFT JOIN classes c ON a.class_id = c.id
               WHERE a.school_id = $1 AND a.pupil_id = $2`;
  const params = [schoolId, pupilId];

  if (term) { params.push(term); query += ` AND a.term = $${params.length}`; }
  if (academic_year) { params.push(academic_year); query += ` AND a.academic_year = $${params.length}`; }

  query += ` ORDER BY s.name`;
  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Delete an assessment
 */
const remove = async (id, schoolId) => {
  const result = await db.query(
    `DELETE FROM assessments WHERE id = $1 AND school_id = $2 RETURNING id`,
    [id, schoolId]
  );
  return result.rows[0] || null;
};

module.exports = { create, bulkCreate, update, findById, findBySchool, getPupilReport, remove };

