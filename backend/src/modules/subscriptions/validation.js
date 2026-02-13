const Joi = require('joi');

const createSubscriptionSchema = Joi.object({
  school_id: Joi.string().uuid().required(),
  plan_type: Joi.string().valid('starter', 'standard', 'pro').required(),
  amount: Joi.number().min(0).required(),
  currency: Joi.string().max(10).default('UGX'),
  starts_at: Joi.date().iso().required(),
  expires_at: Joi.date().iso().required(),
  payment_reference: Joi.string().max(255).allow('', null),
});

module.exports = { createSubscriptionSchema };

