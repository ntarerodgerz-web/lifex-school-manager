const Joi = require('joi');

const recordAttendanceSchema = Joi.object({
  pupil_id: Joi.string().uuid().required(),
  class_id: Joi.string().uuid().optional(),
  date: Joi.date().iso().default(() => new Date().toISOString().slice(0, 10)),
  status: Joi.string().valid('present', 'absent', 'late', 'excused').required(),
  notes: Joi.string().allow('', null),
});

const bulkAttendanceSchema = Joi.object({
  class_id: Joi.string().uuid().required(),
  date: Joi.date().iso().default(() => new Date().toISOString().slice(0, 10)),
  records: Joi.array().items(
    Joi.object({
      pupil_id: Joi.string().uuid().required(),
      status: Joi.string().valid('present', 'absent', 'late', 'excused').required(),
      notes: Joi.string().allow('', null),
    })
  ).min(1).required(),
});

module.exports = { recordAttendanceSchema, bulkAttendanceSchema };

