/**
 * Multi-Tenant School Isolation Middleware
 *
 * CRITICAL: Ensures every non-SUPER_ADMIN request is scoped to
 * the user's school. Prevents cross-school data access.
 *
 * - Reads school_id from the authenticated user's JWT payload
 * - Blocks any attempt to override school_id from the client body/params
 * - Attaches req.schoolId for downstream use
 */
const { error } = require('../utils/response');

const schoolIsolation = (req, res, next) => {
  if (!req.user) {
    return error(res, { statusCode: 401, message: 'Authentication required.' });
  }

  // SUPER_ADMIN can optionally pass school_id as query param to act on any school
  if (req.user.role === 'SUPER_ADMIN') {
    req.schoolId = req.query.school_id || req.body.school_id || req.user.schoolId;
    return next();
  }

  // For all other roles, school_id comes ONLY from the JWT — never from the client
  if (!req.user.schoolId) {
    return error(res, {
      statusCode: 403,
      message: 'No school associated with your account.',
    });
  }

  // Override any client-supplied school_id to prevent injection
  req.schoolId = req.user.schoolId;
  if (req.body) req.body.school_id = req.user.schoolId;

  next();
};

module.exports = schoolIsolation;

