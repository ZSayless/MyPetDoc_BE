const Joi = require("joi");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const ApiError = require("../exceptions/ApiError");

const validateRegister = (req, res, next) => {
  if (!req.body) {
    throw new ApiError(400, "No data provided");
  }

  console.log("Request body:", req.body);

  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    full_name: Joi.string().required(),
    phone_number: Joi.string()
      .regex(/^[0-9]{10}$/)
      .min(10)
      .max(10)
      .required(),
    role: Joi.string()
      .valid("GENERAL_USER", "HOSPITAL_ADMIN", "ADMIN")
      .required(),
    pet_type: Joi.string()
      .valid(
        "DOG",
        "CAT",
        "BIRD",
        "RABBIT",
        "FISH",
        "HAMSTER",
        "REPTILE",
        "OTHER"
      )
      .when("role", {
        is: "GENERAL_USER",
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
    pet_age: Joi.number().integer().min(0).when("role", {
      is: "GENERAL_USER",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    pet_notes: Joi.string().when("role", {
      is: "GENERAL_USER",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    pet_photo: Joi.string().when("role", {
      is: "GENERAL_USER",
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    }),
    // Allow fields from multer
    avatar: Joi.any(),
    files: Joi.any(),
    uploadedFiles: Joi.any(),
  }).unknown(true);

  const { error } = schema.validate(req.body);
  if (error) {
    console.log("Error:", error);
    throw new ApiError(400, error.details[0].message);
  }
  next();
};

const validateAuth = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // Check Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new ApiError(401, "Please login");
      }

      // Get token
      const token = authHeader.split(" ")[1];

      // check if token is decoded
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // check if user is found
      const user = await User.findById(decoded.id);

      if (!user) {
        throw new ApiError(401, "User not found");
      }

      // Check if user is locked
      if (user.is_locked) {
        throw new ApiError(401, "Account is locked");
      }

      // Check if user is activated
      if (!user.is_active) {
        throw new ApiError(401, "Account is not activated");
      }

      // Check role
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        throw new ApiError(
          403,
          "You do not have permission to perform this action"
        );
      }

      // Save user information to request
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
