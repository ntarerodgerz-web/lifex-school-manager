const db = require('../../config/db');

/**
 * Record attendance for a single pupil
 */
const record = async (data) => {
  const result = await db.query(
    `INSERT INTO attendance (school_id, pupil_id, class_id, date, status, recorded_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (pupil_id, date) DO UPDATE SET
       status = EXCLUDED.status,
       recorded_by = EXCLUDED.recorded_by,
       notes = EXCLUDED.notes,
       updated_at = NOW()
     RETURNING *`,
    [
      data.school_id, data.pupil_id, data.class_id || null,
      data.date || new Date().toISOString().slice(0, 10),
      data.status, data.recorded_by || null, data.notes || null,
    ]
  );
  return result.rows[0];
};

/**
 * Bulk record attendance for a class
 */
const bulkRecord = async (schoolId, records, recordedBy) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const results = [];

    for (const rec of records) {
      const result = await client.query(
        `INSERT INTO attendance (school_id, pupil_id, class_id, date, status, recorded_by, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (pupil_id, date) DO UPDATE SET
           status = EXCLUDED.status,
           recorded_by = EXCLUDED.recorded_by,
           notes = EXCLUDED.notes,
           updated_at = NOW()
         RETURNING *`,
        [schoolId, rec.pupil_id, rec.class_id || null, rec.date, rec.status, recordedBy, rec.notes || null]
      );
      results.push(result.rows[0]);
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get attendance for a class on a specific date
 */
const findByClassDate = async (schoolId, classId, date) => {
  const result = await db.query(
    `SELECT a.*, p.first_name, p.last_name, p.admission_number, p.photo_url
     FROM attendance a
     JOIN pupils p ON a.pupil_id = p.id
     WHERE a.school_id = $1 AND a.class_id = $2 AND a.date = $3
     ORDER BY p.first_name ASC`,
    [schoolId, classId, date]
  );
  return result.rows;
};

/**
 * Get attendance for a pupil
 */
const findByPupil = async (schoolId, pupilId, { from, to }) => {
  let query = `SELECT * FROM attendance WHERE school_id = $1 AND pupil_id = $2`;
  const params = [schoolId, pupilId];

  if (from) {
    params.push(from);
    query += ` AND date >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    query += ` AND date <= $${params.length}`;
  }

  query += ` ORDER BY date DESC`;
  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Daily attendance summary for a school
 */
const dailySummary = async (schoolId, date) => {
  const result = await db.query(
    `SELECT
       c.id as class_id, c.name as class_name,
       COUNT(*) FILTER (WHERE a.status = 'present') as present_count,
       COUNT(*) FILTER (WHERE a.status = 'absent') as absent_count,
       COUNT(*) FILTER (WHERE a.status = 'late') as late_count,
       COUNT(*) FILTER (WHERE a.status = 'excused') as excused_count,
       COUNT(*) as total_recorded,
       (SELECT COUNT(*) FROM pupils p2 WHERE p2.class_id = c.id AND p2.is_active = true) as total_pupils
     FROM classes c
     LEFT JOIN attendance a ON a.class_id = c.id AND a.date = $2 AND a.school_id = $1
     WHERE c.school_id = $1 AND c.is_active = true
     GROUP BY c.id, c.name
     ORDER BY c.name`,
    [schoolId, date]
  );
  return result.rows;
};

module.exports = { record, bulkRecord, findByClassDate, findByPupil, dailySummary };

