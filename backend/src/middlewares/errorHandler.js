/**
 * Centralised Error Handler
 * Catches all unhandled errors and returns a clean JSON response.
 * Never exposes raw SQL or stack traces to the client.
 */
const logger = require('../utils/logger');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  logger.error(err.message, {
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  // Joi validation error
  if (err.isJoi || err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.details
        ? err.details.map((d) => d.message)
        : [err.message],
    });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with that information already exists.',
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist.',
    });
  }

  const statusCode = err.statusCode || 500;
  const message =
    env.nodeEnv === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;

