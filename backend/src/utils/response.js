/**
 * Standardised API response helpers.
 * Every endpoint must return { success, message, data }.
 */

const success = (res, { statusCode = 200, message = 'Success', data = null } = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const error = (res, { statusCode = 500, message = 'Internal server error', errors = null } = {}) => {
  const body = {
    success: false,
    message,
  };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { success, error };

