const Joi = require('joi');

const createUserSchema = Joi.object({
  first_name: Joi.string().min(2).max(100).required(),
  last_name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^\+?\d{9,15}$/).optional(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('SCHOOL_ADMIN', 'TEACHER', 'PARENT').required(),
}).or('email', 'phone');

const updateUserSchema = Joi.object({
  first_name: Joi.string().min(2).max(100),
  last_name: Joi.string().min(2).max(100),
  email: Joi.string().email().allow('', null),
  phone: Joi.string().pattern(/^\+?\d{9,15}$/).allow('', null),
  avatar_url: Joi.string().uri().allow('', null),
  is_active: Joi.boolean(),
}).min(1);

module.exports = { createUserSchema, updateUserSchema };

