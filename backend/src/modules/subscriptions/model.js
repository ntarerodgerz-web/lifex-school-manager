const db = require('../../config/db');

const create = async (data) => {
  const result = await db.query(
    `INSERT INTO subscriptions (school_id, plan_type, amount, currency, status, starts_at, expires_at,
     payment_reference, pesapal_order_id, pesapal_tracking_id, payment_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      data.school_id, data.plan_type, data.amount || 0, data.currency || 'UGX',
      data.status || 'pending', data.starts_at, data.expires_at,
      data.payment_reference || null,
      data.pesapal_order_id || null,
      data.pesapal_tracking_id || null,
      data.payment_status || 'pending',
    ]
  );
  return result.rows[0];
};

const findBySchool = async (schoolId) => {
  const result = await db.query(
    `SELECT * FROM subscriptions WHERE school_id = $1 ORDER BY created_at DESC`, [schoolId]
  );
  return result.rows;
};

const getActive = async (schoolId) => {
  const result = await db.query(
    `SELECT * FROM subscriptions WHERE school_id = $1 AND status = 'active' AND expires_at > NOW()
     ORDER BY expires_at DESC LIMIT 1`, [schoolId]
  );
  return result.rows[0] || null;
};

const findByPesapalOrderId = async (orderId) => {
  const result = await db.query(
    `SELECT * FROM subscriptions WHERE pesapal_order_id = $1`, [orderId]
  );
  return result.rows[0] || null;
};

const findByPesapalTrackingId = async (trackingId) => {
  const result = await db.query(
    `SELECT * FROM subscriptions WHERE pesapal_tracking_id = $1`, [trackingId]
  );
  return result.rows[0] || null;
};

const updatePaymentStatus = async (id, data) => {
  const fields = [];
  const values = [];
  let idx = 1;

  const allowed = [
    'status', 'payment_status', 'pesapal_tracking_id',
    'pesapal_payment_method', 'payment_reference',
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(data[key]);
      idx++;
    }
  }

  if (fields.length === 0) return null;
  fields.push('updated_at = NOW()');
  values.push(id);

  const result = await db.query(
    `UPDATE subscriptions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
};

/**
 * Activate a subscription and update the school record
 */
const activate = async (schoolId, planType, expiresAt) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE schools SET subscription_status = 'active', plan_type = $2, subscription_expires_at = $3, updated_at = NOW()
       WHERE id = $1`,
      [schoolId, planType, expiresAt]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  create, findBySchool, getActive,
  findByPesapalOrderId, findByPesapalTrackingId,
  updatePaymentStatus, activate,
};
