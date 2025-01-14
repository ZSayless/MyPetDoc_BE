const sanitizeHtml = require("sanitize-html");
const ApiError = require("../exceptions/ApiError");

// Export function return middleware
const sanitizer = () => {
  return (req, res, next) => {
    // Sanitize body
    if (req.body) {
      Object.keys(req.body).forEach((key) => {
        if (typeof req.body[key] === "string") {
          req.body[key] = sanitizeHtml(req.body[key], {
            allowedTags: [],
            allowedAttributes: {},
          });
        }
      });
    }

    // Sanitize query parameters
    if (req.query) {
      Object.keys(req.query).forEach((key) => {
        if (typeof req.query[key] === "string") {
          req.query[key] = sanitizeHtml(req.query[key], {
            allowedTags: [],
            allowedAttributes: {},
          });
        }
      });
    }

    next();
  };
};

const validateInput = (schema) => {
  return async (req, res, next) => {
    try {
      await schema.validateAsync(req.body);
      next();
    } catch (error) {
      next(new ApiError(400, error.message));
    }
  };
};

module.exports = {
  sanitizer,
  validateInput,
};
