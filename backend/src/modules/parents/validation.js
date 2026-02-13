const Joi = require('joi');

const createParentSchema = Joi.object({
  first_name: Joi.string().min(2).max(100).required(),
  last_name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^\+?\d{9,15}$/).optional(),
  password: Joi.string().min(6).default('Parent@123'),
  occupation: Joi.string().max(255).allow('', null),
  address: Joi.string().allow('', null),
  relationship: Joi.string().max(50).default('Parent'),
  // Auto-link children
  pupil_ids: Joi.array().items(Joi.string().uuid()).optional(),
}).or('email', 'phone');

const updateParentSchema = Joi.object({
  first_name: Joi.string().min(2).max(100),
  last_name: Joi.string().min(2).max(100),
  email: Joi.string().email().allow('', null),
  phone: Joi.string().pattern(/^\+?\d{9,15}$/).allow('', null),
  occupation: Joi.string().max(255).allow('', null),
  address: Joi.string().allow('', null),
  relationship: Joi.string().max(50),
}).min(1);

const linkChildSchema = Joi.object({
  pupil_id: Joi.string().uuid().required(),
  is_primary: Joi.boolean().default(false),
});

module.exports = { createParentSchema, updateParentSchema, linkChildSchema };

