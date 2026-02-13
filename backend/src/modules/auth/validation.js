const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^\+?\d{9,15}$/).optional(),
  password: Joi.string().min(6).required(),
}).or('email', 'phone').messages({
  'object.missing': 'Email or phone number is required.',
});

const registerSchoolSchema = Joi.object({
  // School info
  school_name: Joi.string().min(2).max(255).required(),
  school_email: Joi.string().email().allow('', null).optional(),
  school_phone: Joi.string().pattern(/^\+?\d{9,15}$/).allow('', null).optional(),
  school_address: Joi.string().allow('', null).optional(),
  country: Joi.string().max(100).allow('', null).optional(),
  district: Joi.string().allow('', null).optional(),
  region: Joi.string().allow('', null).optional(),
  motto: Joi.string().max(500).allow('', null).optional(),

  // Admin user info
  first_name: Joi.string().min(2).max(100).required(),
  last_name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?\d{9,15}$/).allow('', null).optional(),
  password: Joi.string().min(8).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
    }),
});

const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(8).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
    }),
});

module.exports = {
  loginSchema,
  registerSchoolSchema,
  refreshTokenSchema,
  changePasswordSchema,
};

