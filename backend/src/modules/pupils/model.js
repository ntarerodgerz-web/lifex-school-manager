const db = require('../../config/db');

const ALL_INSERT_FIELDS = [
  'school_id', 'first_name', 'last_name', 'other_names', 'gender', 'date_of_birth',
  'admission_number', 'class_id', 'photo_url', 'address', 'district',
  'nationality', 'religion', 'previous_school', 'previous_class', 'reason_for_leaving',
  'medical_notes', 'blood_group', 'allergies', 'disabilities',
  'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
  'enrollment_type', 'is_boarding',
];

const ALL_UPDATE_FIELDS = [
  'first_name', 'last_name', 'other_names', 'gender', 'date_of_birth',
  'admission_number', 'class_id', 'photo_url', 'address', 'district',
  'nationality', 'religion', 'previous_school', 'previous_class', 'reason_for_leaving',
  'medical_notes', 'blood_group', 'allergies', 'disabilities',
  'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
  'enrollment_type', 'is_boarding', 'is_active',
];

const create = async (data) => {
  const cols = [];
  const vals = [];
  const placeholders = [];

  ALL_INSERT_FIELDS.forEach((key) => {
    cols.push(key);
    vals.push(data[key] !== undefined && data[key] !== '' ? data[key] : null);
    placeholders.push(`$${vals.length}`);
  });

  const result = await db.query(
    `INSERT INTO pupils (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    vals
  );
  return result.rows[0];
};

const findBySchool = async (schoolId, { class_id, page = 1, limit = 50, search } = {}) => {
  const offset = (page - 1) * limit;

  let whereClause = `WHERE p.school_id = $1 AND p.is_active = true`;
  const params = [schoolId];

  if (class_id) {
    params.push(class_id);
    whereClause += ` AND p.class_id = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (p.first_name ILIKE $${params.length} OR p.last_name ILIKE $${params.length} OR p.admission_number ILIKE $${params.length})`;
  }

  const countParams = [...params];
  const countQuery = `SELECT COUNT(*) FROM pupils p LEFT JOIN classes c ON p.class_id = c.id ${whereClause}`;

  const dataQuery = `SELECT p.*, c.name as class_name FROM pupils p LEFT JOIN classes c ON p.class_id = c.id ${whereClause} ORDER BY p.first_name ASC, p.last_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const [dataResult, countResult] = await Promise.all([
    db.query(dataQuery, params),
    db.query(countQuery, countParams),
  ]);

  return {
    pupils: dataResult.rows,
    total: parseInt(countResult.rows[0]?.count || '0', 10),
    page,
    limit,
  };
};

const findById = async (id, schoolId) => {
  const result = await db.query(
    `SELECT p.*, c.name as class_name
     FROM pupils p
     LEFT JOIN classes c ON p.class_id = c.id
     WHERE p.id = $1 AND p.school_id = $2`,
    [id, schoolId]
  );
  return result.rows[0] || null;
};

/**
 * Get a pupil's parents
 */
const getParents = async (pupilId, schoolId) => {
  const result = await db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
            pa.occupation, pa.relationship, pp.is_primary
     FROM pupil_parents pp
     JOIN parents pa ON pp.parent_id = pa.id
     JOIN users u ON pa.user_id = u.id
     WHERE pp.pupil_id = $1 AND pp.school_id = $2`,
    [pupilId, schoolId]
  );
  return result.rows;
};

const update = async (id, schoolId, data) => {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key of ALL_UPDATE_FIELDS) {
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
    `UPDATE pupils SET ${fields.join(', ')} WHERE id = $${idx} AND school_id = $${idx + 1} RETURNING *`,
    values
  );
  return result.rows[0];
};

const remove = async (id, schoolId) => {
  const result = await db.query(
    `UPDATE pupils SET is_active = false, updated_at = NOW() WHERE id = $1 AND school_id = $2 RETURNING id`,
    [id, schoolId]
  );
  return result.rows[0];
};

module.exports = { create, findBySchool, findById, getParents, update, remove };
