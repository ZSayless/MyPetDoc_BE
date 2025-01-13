const Joi = require("joi");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const ApiError = require("../exceptions/ApiError");

const validateRegister = (req, res, next) => {

  if(!req.body){
    throw new ApiError(400, "No data provided");
  }

  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    full_name: Joi.string().required(),
    role: Joi.string()
      .valid("GENERAL_USER", "HOSPITAL_ADMIN", "ADMIN")
      .required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }
  next();
};

const validateAuth = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // Kiểm tra header Authorization
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new ApiError(401, "Please login");
      }

      // Lấy token
      const token = authHeader.split(" ")[1];

      // kiểm tra token được decode
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // kiểm tra user được tìm thấy
      const user = await User.findById(decoded.id);

      if (!user) {
        throw new ApiError(401, "User not found");
      }

      // Kiểm tra user có bị khóa
      if (user.is_locked) {
        throw new ApiError(401, "Account is locked");
      }

      // Kiểm tra user có được kích hoạt
      if (!user.is_active) {
        throw new ApiError(401, "Account is not activated");
      }

      // Kiểm tra role
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        throw new ApiError(403, "You do not have permission to perform this action");
      }

      // Lưu thông tin user vào request
      req.user = user;

      next();
    } catch (error) {
      console.log("Error:", error);
      if (error.name === "JsonWebTokenError") {
        next(new ApiError(401, "Invalid token"));
      } else if (error.name === "TokenExpiredError") {
        next(new ApiError(401, "Token expired"));
      } else {
        next(error);
      }
    }
  };
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateAuth,
};
