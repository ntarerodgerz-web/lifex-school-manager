const Joi = require('joi');

const createCampusSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  code: Joi.string().max(20).allow('', null),
  address: Joi.string().max(255).allow('', null),
  district: Joi.string().max(100).allow('', null),
  region: Joi.string().max(100).allow('', null),
  phone: Joi.string().max(20).allow('', null),
  email: Joi.string().email().allow('', null),
  is_main: Joi.boolean().default(false),
});

const updateCampusSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  code: Joi.string().max(20).allow('', null),
  address: Joi.string().max(255).allow('', null),
  district: Joi.string().max(100).allow('', null),
  region: Joi.string().max(100).allow('', null),
  phone: Joi.string().max(20).allow('', null),
  email: Joi.string().email().allow('', null),
  is_main: Joi.boolean(),
}).min(1);

module.exports = { createCampusSchema, updateCampusSchema };

