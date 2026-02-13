const Joi = require('joi');

const sendNotificationSchema = Joi.object({
  to: Joi.alternatives().try(
    Joi.string().email(),
    Joi.array().items(Joi.string().email()).min(1).max(500)
  ).required(),
  subject: Joi.string().min(1).max(200).default('School Notification'),
  message: Joi.string().min(1).max(5000).required(),
});

const sendBulkNotificationSchema = Joi.object({
  role: Joi.string().valid('parents', 'teachers', 'all').default('all'),
  subject: Joi.string().min(1).max(200).default('School Notification'),
  message: Joi.string().min(1).max(5000).required(),
});

module.exports = { sendNotificationSchema, sendBulkNotificationSchema };
