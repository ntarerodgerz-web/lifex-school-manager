/**
 * API Keys Service
 * ─────────────────────────────────────────────
 * Generates, validates, and manages API keys for external access.
 * Only available on Pro plan (gated by featureGuard middleware).
 *
 * Key format: sm_live_<32 random hex chars>
 * Storage:    only the SHA-256 hash is stored; the raw key is shown once on creation.
 * Lookup:     key_hash for secure DB lookup.
 */
const crypto = require('crypto');
const apiKeyModel = require('./model');
const logger = require('../../utils/logger');

const KEY_PREFIX_TAG = 'sm_live_';
const MAX_KEYS_PER_SCHOOL = 5;

/**
 * Generate a cryptographically secure API key.
 * @returns {{ rawKey: string, keyHash: string, keyPrefix: string }}
 */
const generateKey = () => {
  const randomPart = crypto.randomBytes(32).toString('hex');
  const rawKey = `${KEY_PREFIX_TAG}${randomPart}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.substring(0, 12);
  return { rawKey, keyHash, keyPrefix };
};

/**
 * Hash a raw API key for lookup.
 */
const hashKey = (rawKey) => {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
};

/**
 * Create a new API key for a school.
 */
const createKey = async (schoolId, data) => {
  // Enforce max keys per school
  const count = await apiKeyModel.countBySchool(schoolId);
  if (count >= MAX_KEYS_PER_SCHOOL) {
    const err = new Error(`Maximum ${MAX_KEYS_PER_SCHOOL} active API keys allowed per school. Please revoke an existing key first.`);
    err.statusCode = 400;
    throw err;
  }

  const { rawKey, keyHash, keyPrefix } = generateKey();

  const record = await apiKeyModel.create({
    school_id: schoolId,
    name: data.name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    permissions: data.permissions || ['read'],
    rate_limit: data.rate_limit || 100,
    expires_at: data.expires_at || null,
  });

  logger.info(`API key created for school ${schoolId}: ${keyPrefix}...`);

  // Return the raw key ONLY on creation — it cannot be retrieved again
  return { ...record, key: rawKey };
};

/**
 * Authenticate a request by API key.
 * @param {string} rawKey — the full raw API key from the request header
 * @returns {Object|null} — the key record with school info, or null
 */
const authenticate = async (rawKey) => {
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX_TAG)) return null;

  const keyHash = hashKey(rawKey);
  const record = await apiKeyModel.findByHash(keyHash);

  if (!record) return null;

  // Check expiration
  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return null;
  }

  // Check school subscription is active or trial
  if (!['active', 'trial'].includes(record.subscription_status)) {
    return null;
  }

  // Check plan is Pro
  if (record.plan_type !== 'pro') {
    return null;
  }

  // Update last used timestamp (fire and forget)
  apiKeyModel.touchLastUsed(record.id).catch(() => {});

  return record;
};

/**
 * List all API keys for a school.
 */
const listKeys = async (schoolId) => {
  return apiKeyModel.findBySchool(schoolId);
};

/**
 * Revoke an API key.
 */
const revokeKey = async (id, schoolId) => {
  const key = await apiKeyModel.revoke(id, schoolId);
  if (!key) {
    const err = new Error('API key not found');
    err.statusCode = 404;
    throw err;
  }
  logger.info(`API key revoked: ${key.key_prefix}... for school ${schoolId}`);
  return key;
};

/**
 * Delete an API key permanently.
 */
const deleteKey = async (id, schoolId) => {
  const key = await apiKeyModel.remove(id, schoolId);
  if (!key) {
    const err = new Error('API key not found');
    err.statusCode = 404;
    throw err;
  }
  return key;
};

module.exports = { createKey, authenticate, listKeys, revokeKey, deleteKey, hashKey };

