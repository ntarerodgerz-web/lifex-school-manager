const db = require('../../config/db');

/**
 * Create a new API key record.
 */
const create = async (data) => {
  const result = await db.query(
    `INSERT INTO api_keys (school_id, name, key_hash, key_prefix, permissions, rate_limit, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, school_id, name, key_prefix, permissions, rate_limit, expires_at, is_active, created_at`,
    [
      data.school_id, data.name, data.key_hash, data.key_prefix,
      JSON.stringify(data.permissions || ['read']),
      data.rate_limit || 100,
      data.expires_at || null,
    ]
  );
  return result.rows[0];
};

/**
 * Find all active API keys for a school (never return the hash).
 */
const findBySchool = async (schoolId) => {
  const result = await db.query(
    `SELECT id, name, key_prefix, permissions, rate_limit, last_used_at, expires_at, is_active, created_at
     FROM api_keys WHERE school_id = $1 ORDER BY created_at DESC`,
    [schoolId]
  );
  return result.rows;
};

/**
 * Find a key by its hash for authentication.
 */
const findByHash = async (keyHash) => {
  const result = await db.query(
    `SELECT ak.*, s.id as school_id, s.plan_type, s.subscription_status
     FROM api_keys ak
     JOIN schools s ON ak.school_id = s.id
     WHERE ak.key_hash = $1 AND ak.is_active = true`,
    [keyHash]
  );
  return result.rows[0];
};

/**
 * Update last_used_at timestamp.
 */
const touchLastUsed = async (id) => {
  await db.query(
    `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
    [id]
  );
};

/**
 * Revoke (soft-delete) a key.
 */
const revoke = async (id, schoolId) => {
  const result = await db.query(
    `UPDATE api_keys SET is_active = false, updated_at = NOW()
     WHERE id = $1 AND school_id = $2 RETURNING id, name, key_prefix`,
    [id, schoolId]
  );
  return result.rows[0];
};

/**
 * Hard delete a key.
 */
const remove = async (id, schoolId) => {
  const result = await db.query(
    `DELETE FROM api_keys WHERE id = $1 AND school_id = $2 RETURNING id`,
    [id, schoolId]
  );
  return result.rows[0];
};

/**
 * Count active keys for a school.
 */
const countBySchool = async (schoolId) => {
  const result = await db.query(
    `SELECT COUNT(*)::int as count FROM api_keys WHERE school_id = $1 AND is_active = true`,
    [schoolId]
  );
  return result.rows[0].count;
};

module.exports = { create, findBySchool, findByHash, touchLastUsed, revoke, remove, countBySchool };

