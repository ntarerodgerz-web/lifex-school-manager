const Joi = require('joi');

const createTeacherSchema = Joi.object({
  // User fields (creates user + teacher in one call)
  first_name: Joi.string().min(2).max(100).required(),
  last_name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^\+?\d{9,15}$/).optional(),
  password: Joi.string().min(6).default('Teacher@123'),
  // Teacher-specific
  employee_number: Joi.string().max(50).allow('', null),
  qualification: Joi.string().max(255).allow('', null),
  specialization: Joi.string().max(255).allow('', null),
  date_joined: Joi.date().iso().optional(),
  nin: Joi.string().max(50).allow('', null),
  salary: Joi.number().min(0).optional(),
}).or('email', 'phone');

const updateTeacherSchema = Joi.object({
  employee_number: Joi.string().max(50).allow('', null),
  qualification: Joi.string().max(255).allow('', null),
  specialization: Joi.string().max(255).allow('', null),
  date_joined: Joi.date().iso(),
  nin: Joi.string().max(50).allow('', null),
  salary: Joi.number().min(0),
  is_active: Joi.boolean(),
  // Also allow updating user info
  first_name: Joi.string().min(2).max(100),
  last_name: Joi.string().min(2).max(100),
  email: Joi.string().email().allow('', null),
  phone: Joi.string().pattern(/^\+?\d{9,15}$/).allow('', null),
}).min(1);

module.exports = { createTeacherSchema, updateTeacherSchema };

