const Joi = require('joi');

const createAnnouncementSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  body: Joi.string().min(1).required(),
  audience: Joi.string().valid('all', 'teachers', 'parents', 'class').default('all'),
  target_class_id: Joi.string().uuid().allow(null),
});

const updateAnnouncementSchema = Joi.object({
  title: Joi.string().min(1).max(255),
  body: Joi.string().min(1),
  audience: Joi.string().valid('all', 'teachers', 'parents', 'class'),
  target_class_id: Joi.string().uuid().allow(null),
  is_active: Joi.boolean(),
}).min(1);

module.exports = { createAnnouncementSchema, updateAnnouncementSchema };

