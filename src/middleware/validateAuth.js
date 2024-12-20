const Joi = require("joi");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const ApiError = require("../exceptions/ApiError");

const validateRegister = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    full_name: Joi.string().required(),
    role: Joi.string().valid("GENERAL_USER", "HOSPITAL_ADMIN"),
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
        throw new ApiError(401, "Vui lòng đăng nhập");
      }

      // Lấy token
      const token = authHeader.split(" ")[1];

      // kiểm tra token được decode
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // kiểm tra user được tìm thấy
      const user = await User.findById(decoded.id);

      if (!user) {
        throw new ApiError(401, "Người dùng không tồn tại");
      }

      // Kiểm tra user có bị khóa
      if (user.is_locked) {
        throw new ApiError(401, "Tài khoản đã bị khóa");
      }

      // Kiểm tra user có được kích hoạt
      if (!user.is_active) {
        throw new ApiError(401, "Tài khoản chưa được kích hoạt");
      }

      // Kiểm tra role
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        throw new ApiError(403, "Bạn không có quyền thực hiện hành động này");
      }

      // Lưu thông tin user vào request
      req.user = user;

      next();
    } catch (error) {
      console.log("Error:", error);
      if (error.name === "JsonWebTokenError") {
        next(new ApiError(401, "Token không hợp lệ"));
      } else if (error.name === "TokenExpiredError") {
        next(new ApiError(401, "Token đã hết hạn"));
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
