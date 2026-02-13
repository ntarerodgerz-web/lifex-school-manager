/**
 * API Key Authentication Middleware
 * ─────────────────────────────────────────────
 * Authenticates requests using an API key in the X-API-Key header.
 * Used for external integrations (Pro plan only).
 *
 * Usage:
 *   router.use(apiKeyAuth);   // instead of authenticate middleware
 *
 * The key is validated, and on success req.schoolId and req.apiKey are set.
 */
const apiKeyService = require('../modules/apikeys/service');

const apiKeyAuth = async (req, res, next) => {
  try {
    const rawKey = req.headers['x-api-key'];

    if (!rawKey) {
      return res.status(401).json({
        success: false,
        message: 'Missing API key. Provide it in the X-API-Key header.',
      });
    }

    const keyRecord = await apiKeyService.authenticate(rawKey);

    if (!keyRecord) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired API key.',
      });
    }

    // Attach school context (mimics what schoolIsolation does)
    req.schoolId = keyRecord.school_id;
    req.apiKey = {
      id: keyRecord.id,
      name: keyRecord.name,
      permissions: keyRecord.permissions,
      rate_limit: keyRecord.rate_limit,
    };

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = apiKeyAuth;

