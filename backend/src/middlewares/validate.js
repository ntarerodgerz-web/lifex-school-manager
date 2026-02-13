/**
 * Request Validation Middleware Factory
 * Wraps a Joi schema and validates req.body (or other source).
 *
 * Usage:
 *   validate(loginSchema)           // validates req.body
 *   validate(schema, 'query')       // validates req.query
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map((d) => d.message),
      });
    }

    // Replace source with sanitised values
    req[source] = value;
    next();
  };
};

module.exports = validate;

