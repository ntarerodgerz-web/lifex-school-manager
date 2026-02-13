const db = require('../../config/db');

const create = async (data) => {
  const result = await db.query(
    `INSERT INTO payments (school_id, pupil_id, fee_id, amount, payment_method, reference_number, payment_date, received_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [data.school_id, data.pupil_id, data.fee_id || null, data.amount,
     data.payment_method || 'cash', data.reference_number || null,
     data.payment_date || new Date().toISOString().slice(0, 10),
     data.received_by || null, data.notes || null]
  );
  return result.rows[0];
};

const findBySchool = async (schoolId, { pupil_id, fee_id, from, to, page = 1, limit = 50 } = {}) => {
  const offset = (page - 1) * limit;
  let query = `SELECT py.*, p.first_name || ' ' || p.last_name as pupil_name, f.name as fee_name
               FROM payments py
               JOIN pupils p ON py.pupil_id = p.id
               LEFT JOIN fees f ON py.fee_id = f.id
               WHERE py.school_id = $1`;
  const params = [schoolId];

  if (pupil_id) { params.push(pupil_id); query += ` AND py.pupil_id = $${params.length}`; }
  if (fee_id) { params.push(fee_id); query += ` AND py.fee_id = $${params.length}`; }
  if (from) { params.push(from); query += ` AND py.payment_date >= $${params.length}`; }
  if (to) { params.push(to); query += ` AND py.payment_date <= $${params.length}`; }

  query += ` ORDER BY py.payment_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Get balance for a pupil (total fees - total payments)
 */
const getPupilBalance = async (schoolId, pupilId) => {
  const result = await db.query(
    `SELECT
       COALESCE((SELECT SUM(f.amount) FROM fees f
         JOIN pupils p ON (f.class_id = p.class_id OR f.class_id IS NULL) AND f.school_id = p.school_id
         WHERE p.id = $2 AND f.school_id = $1 AND f.is_active = true), 0) as total_fees,
       COALESCE((SELECT SUM(py.amount) FROM payments py WHERE py.pupil_id = $2 AND py.school_id = $1), 0) as total_paid`,
    [schoolId, pupilId]
  );
  const row = result.rows[0];
  return {
    total_fees: parseFloat(row.total_fees),
    total_paid: parseFloat(row.total_paid),
    balance_due: parseFloat(row.total_fees) - parseFloat(row.total_paid),
  };
};

module.exports = { create, findBySchool, getPupilBalance };

