const Joi = require('joi');

const updateSchoolSchema = Joi.object({
  name: Joi.string().min(2).max(255),
  motto: Joi.string().max(500).allow('', null),
  address: Joi.string().allow('', null),
  district: Joi.string().allow('', null),
  region: Joi.string().allow('', null),
  phone: Joi.string().pattern(/^\+?\d{9,15}$/).allow('', null),
  email: Joi.string().email().allow('', null),
}).min(1);

const updateBrandingSchema = Joi.object({
  primary_color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional(),
  secondary_color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional(),
  font_family: Joi.string().max(100).optional(),
  font_style: Joi.string().max(100).optional(), // e.g. "normal", "bold", "italic", "uppercase", "bold uppercase", "italic uppercase", etc.
  header_image_url: Joi.string().uri().allow('', null).optional(),
}).min(1);

module.exports = { updateSchoolSchema, updateBrandingSchema };

