const Joi = require('joi');

const createApiKeySchema = Joi.object({
  name: Joi.string().min(2).max(100).required()
    .messages({ 'any.required': 'Please provide a name for this API key (e.g. "Mobile App", "Integration")' }),
  permissions: Joi.array().items(
    Joi.string().valid('read', 'write', 'delete')
  ).default(['read']),
  rate_limit: Joi.number().integer().min(10).max(1000).default(100),
  expires_at: Joi.date().iso().greater('now').allow(null),
});

module.exports = { createApiKeySchema };

