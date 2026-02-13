/**
 * Role-Based Authorization Middleware
 * Usage: authorizeRoles('SCHOOL_ADMIN', 'SUPER_ADMIN')
 */
const { error } = require('../utils/response');

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, {
        statusCode: 401,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return error(res, {
        statusCode: 403,
        message: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
};

module.exports = authorizeRoles;

