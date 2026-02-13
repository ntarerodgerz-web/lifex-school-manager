const Joi = require('joi');

const createBroadcastSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  message: Joi.string().min(1).required(),
  target: Joi.string().valid('all', 'school_admins', 'teachers', 'parents').default('all'),
  target_school_id: Joi.string().uuid().allow(null, ''),
});

module.exports = { createBroadcastSchema };

