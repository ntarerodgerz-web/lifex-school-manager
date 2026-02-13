const Joi = require('joi');

const createPaymentSchema = Joi.object({
  pupil_id: Joi.string().uuid().required(),
  fee_id: Joi.string().uuid().allow(null, '').default(null),
  amount: Joi.number().positive().required(),
  payment_method: Joi.string().valid('cash', 'mobile_money', 'bank_transfer', 'other').default('cash'),
  reference_number: Joi.string().max(100).allow('', null),
  payment_date: Joi.date().iso().default(() => new Date().toISOString().slice(0, 10)),
  notes: Joi.string().allow('', null),
});

module.exports = { createPaymentSchema };

