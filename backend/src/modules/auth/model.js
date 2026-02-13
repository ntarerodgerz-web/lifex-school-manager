const db = require('../../config/db');

/**
 * Find a user by email
 */
const findByEmail = async (email) => {
  const result = await db.query(
    `SELECT u.*, s.name as school_name, s.badge_url as school_badge_url,
            s.subscription_status, s.plan_type, s.is_active as school_active,
            s.trial_ends_at, s.subscription_expires_at,
            sb.primary_color, sb.secondary_color, sb.font_family, sb.font_style
     FROM users u
     LEFT JOIN schools s ON u.school_id = s.id
     LEFT JOIN school_branding sb ON u.school_id = sb.school_id
     WHERE u.email = $1 AND u.is_active = true`,
    [email]
  );
  return result.rows[0] || null;
};

/**
 * Find a user by phone
 */
const findByPhone = async (phone) => {
  const result = await db.query(
    `SELECT u.*, s.name as school_name, s.badge_url as school_badge_url,
            s.subscription_status, s.plan_type, s.is_active as school_active,
            s.trial_ends_at, s.subscription_expires_at,
            sb.primary_color, sb.secondary_color, sb.font_family, sb.font_style
     FROM users u
     LEFT JOIN schools s ON u.school_id = s.id
     LEFT JOIN school_branding sb ON u.school_id = sb.school_id
     WHERE u.phone = $1 AND u.is_active = true`,
    [phone]
  );
  return result.rows[0] || null;
};

/**
 * Find user by ID
 */
const findById = async (id) => {
  const result = await db.query(
    `SELECT u.id, u.school_id, u.first_name, u.last_name, u.email, u.phone, u.role,
            u.avatar_url, u.is_active, u.last_login, u.created_at,
            s.name as school_name, s.badge_url as school_badge_url,
            s.subscription_status, s.plan_type,
            s.trial_ends_at, s.subscription_expires_at,
            sb.primary_color, sb.secondary_color, sb.font_family, sb.font_style
     FROM users u
     LEFT JOIN schools s ON u.school_id = s.id
     LEFT JOIN school_branding sb ON u.school_id = sb.school_id
     WHERE u.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Update last_login timestamp
 */
const updateLastLogin = async (userId) => {
  await db.query(
    `UPDATE users SET last_login = NOW() WHERE id = $1`,
    [userId]
  );
};

/**
 * Update password
 */
const updatePassword = async (userId, passwordHash) => {
  await db.query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [passwordHash, userId]
  );
};

/**
 * Store refresh token
 */
const storeRefreshToken = async (userId, token, expiresAt) => {
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  );
};

/**
 * Find refresh token
 */
const findRefreshToken = async (token) => {
  const result = await db.query(
    `SELECT rt.*, u.role, u.school_id, u.email, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.token = $1 AND rt.expires_at > NOW()`,
    [token]
  );
  return result.rows[0] || null;
};

/**
 * Delete refresh token
 */
const deleteRefreshToken = async (token) => {
  await db.query(`DELETE FROM refresh_tokens WHERE token = $1`, [token]);
};

/**
 * Delete all refresh tokens for a user
 */
const deleteAllUserTokens = async (userId) => {
  await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
};

module.exports = {
  findByEmail,
  findByPhone,
  findById,
  updateLastLogin,
  updatePassword,
  storeRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllUserTokens,
};
