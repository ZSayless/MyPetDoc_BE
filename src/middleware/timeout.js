const ApiError = require("../exceptions/ApiError");

const timeout = (limit) => {
  return (req, res, next) => {
    const timeoutId = setTimeout(() => {
      next(new ApiError(408, "Request timeout"));
    }, limit);

    res.on("finish", () => {
      clearTimeout(timeoutId);
    });

    next();
  };
};

module.exports = timeout;
