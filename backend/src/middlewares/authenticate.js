/**
 * JWT Authentication Middleware
 * Verifies the access token and attaches the user to req.user
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { error } = require('../utils/response');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, {
        statusCode: 401,
        message: 'Authentication required. Please log in.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, env.jwt.secret);

    // Attach user payload to request
    req.user = {
      id: decoded.id,
      schoolId: decoded.schoolId,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, {
        statusCode: 401,
        message: 'Token expired. Please refresh your session.',
      });
    }
    return error(res, {
      statusCode: 401,
      message: 'Invalid authentication token.',
    });
  }
};

module.exports = authenticate;

