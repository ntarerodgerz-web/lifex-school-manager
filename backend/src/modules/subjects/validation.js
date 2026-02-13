const Joi = require('joi');

const createSubjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  code: Joi.string().max(20).allow('', null),
  description: Joi.string().allow('', null),
});

const updateSubjectSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  code: Joi.string().max(20).allow('', null),
  description: Joi.string().allow('', null),
  is_active: Joi.boolean(),
}).min(1);

const assignTeacherSchema = Joi.object({
  teacher_id: Joi.string().uuid().required(),
  subject_id: Joi.string().uuid().required(),
  class_id: Joi.string().uuid().allow('', null),
});

module.exports = { createSubjectSchema, updateSubjectSchema, assignTeacherSchema };
