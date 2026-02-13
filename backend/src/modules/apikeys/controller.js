const apiKeyService = require('./service');
const { success } = require('../../utils/response');

/**
 * POST /api-keys — Create a new API key
 */
const create = async (req, res, next) => {
  try {
    const data = await apiKeyService.createKey(req.schoolId, req.body);
    return success(res, {
      statusCode: 201,
      message: 'API key created. Save the key now — it cannot be shown again.',
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api-keys — List all API keys for the school
 */
const list = async (req, res, next) => {
  try {
    const data = await apiKeyService.listKeys(req.schoolId);
    return success(res, { data });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api-keys/:id/revoke — Revoke (deactivate) an API key
 */
const revoke = async (req, res, next) => {
  try {
    const data = await apiKeyService.revokeKey(req.params.id, req.schoolId);
    return success(res, { message: 'API key revoked', data });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api-keys/:id — Permanently delete an API key
 */
const remove = async (req, res, next) => {
  try {
    await apiKeyService.deleteKey(req.params.id, req.schoolId);
    return success(res, { message: 'API key deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, list, revoke, remove };

