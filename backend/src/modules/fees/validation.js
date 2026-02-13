const Joi = require('joi');

const createFeeSchema = Joi.object({
  name: Joi.string().min(1).max(150).required(),
  amount: Joi.number().positive().required(),
  class_id: Joi.string().uuid().allow(null),
  term: Joi.string().max(20).allow('', null),
  academic_year: Joi.string().max(20).allow('', null),
  due_date: Joi.date().iso().allow(null),
  description: Joi.string().allow('', null),
});

const updateFeeSchema = Joi.object({
  name: Joi.string().min(1).max(150),
  amount: Joi.number().positive(),
  class_id: Joi.string().uuid().allow(null),
  term: Joi.string().max(20).allow('', null),
  academic_year: Joi.string().max(20).allow('', null),
  due_date: Joi.date().iso().allow(null),
  description: Joi.string().allow('', null),
  is_active: Joi.boolean(),
}).min(1);

module.exports = { createFeeSchema, updateFeeSchema };

