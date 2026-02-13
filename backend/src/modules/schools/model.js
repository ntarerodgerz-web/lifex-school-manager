const db = require('../../config/db');

const findById = async (id) => {
  const result = await db.query(
    `SELECT s.*, sb.primary_color, sb.secondary_color, sb.font_family, sb.font_style, sb.header_image_url
     FROM schools s
     LEFT JOIN school_branding sb ON s.id = sb.school_id
     WHERE s.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findAll = async ({ page = 1, limit = 20, search }) => {
  const offset = (page - 1) * limit;
  let query = `SELECT * FROM schools WHERE 1=1`;
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (name ILIKE $${params.length} OR district ILIKE $${params.length} OR country ILIKE $${params.length})`;
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);

  // Count
  let countQuery = `SELECT COUNT(*) FROM schools WHERE 1=1`;
  const countParams = [];
  if (search) {
    countParams.push(`%${search}%`);
    countQuery += ` AND (name ILIKE $${countParams.length} OR district ILIKE $${countParams.length} OR country ILIKE $${countParams.length})`;
  }
  const countResult = await db.query(countQuery, countParams);

  return {
    schools: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
    page,
    limit,
  };
};

const update = async (id, data) => {
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

  if (fields.length === 0) return findById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await db.query(
    `UPDATE schools SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
};

const updateBranding = async (schoolId, data) => {
  const result = await db.query(
    `INSERT INTO school_branding (school_id, primary_color, secondary_color, font_family, font_style, header_image_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (school_id) DO UPDATE SET
       primary_color = COALESCE($2, school_branding.primary_color),
       secondary_color = COALESCE($3, school_branding.secondary_color),
       font_family = COALESCE($4, school_branding.font_family),
       font_style = COALESCE($5, school_branding.font_style),
       header_image_url = COALESCE($6, school_branding.header_image_url),
       updated_at = NOW()
     RETURNING *`,
    [schoolId, data.primary_color, data.secondary_color, data.font_family, data.font_style, data.header_image_url]
  );
  return result.rows[0];
};

module.exports = { findById, findAll, update, updateBranding };

