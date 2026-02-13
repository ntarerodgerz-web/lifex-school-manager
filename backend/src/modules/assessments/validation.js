const Joi = require('joi');

const createAssessmentSchema = Joi.object({
  pupil_id: Joi.string().uuid().required(),
  subject_id: Joi.string().uuid().required(),
  class_id: Joi.string().uuid().allow('', null),
  term: Joi.string().max(20).allow('', null),
  academic_year: Joi.string().max(20).allow('', null),
  score: Joi.number().min(0).max(100).required(),
  grade: Joi.string().max(5).allow('', null),
  remarks: Joi.string().max(500).allow('', null),
});

const bulkAssessmentSchema = Joi.object({
  assessments: Joi.array().items(
    Joi.object({
      pupil_id: Joi.string().uuid().required(),
      subject_id: Joi.string().uuid().required(),
      class_id: Joi.string().uuid().allow('', null),
      term: Joi.string().max(20).allow('', null),
      academic_year: Joi.string().max(20).allow('', null),
      score: Joi.number().min(0).max(100).required(),
      grade: Joi.string().max(5).allow('', null),
      remarks: Joi.string().max(500).allow('', null),
    })
  ).min(1).required(),
});

const updateAssessmentSchema = Joi.object({
  score: Joi.number().min(0).max(100),
  grade: Joi.string().max(5).allow('', null),
  remarks: Joi.string().max(500).allow('', null),
  term: Joi.string().max(20).allow('', null),
  academic_year: Joi.string().max(20).allow('', null),
}).min(1);

module.exports = { createAssessmentSchema, bulkAssessmentSchema, updateAssessmentSchema };

