const Joi = require('joi');

const createClassSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  section: Joi.string().max(50).allow('', null),
  capacity: Joi.number().integer().min(1).max(200).default(40),
  teacher_id: Joi.string().uuid().allow(null),
  academic_year: Joi.string().max(20).allow('', null),
});

const updateClassSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  section: Joi.string().max(50).allow('', null),
  capacity: Joi.number().integer().min(1).max(200),
  teacher_id: Joi.string().uuid().allow(null),
  academic_year: Joi.string().max(20).allow('', null),
  is_active: Joi.boolean(),
}).min(1);

module.exports = { createClassSchema, updateClassSchema };

