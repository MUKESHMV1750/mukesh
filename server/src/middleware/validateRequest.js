const AppError = require('../utils/AppError');

/**
 * Validate required fields in the request body
 */
function validateRequest(requiredFields) {
  return (req, res, next) => {
    const missing = requiredFields.filter((field) => !req.body[field]);
    if (missing.length > 0) {
      return next(
        new AppError(`Missing required fields: ${missing.join(', ')}`, 400)
      );
    }
    next();
  };
}

module.exports = validateRequest;
