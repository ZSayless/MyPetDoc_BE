const Joi = require("joi");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const ApiError = require("../exceptions/ApiError");
const cloudinary = require("cloudinary");

const validateRegister = async (req, res, next) => {
  try {
    if (!req.body) {
      throw new ApiError(400, "No data provided");
    }

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
        .valid("GENERAL_USER", "HOSPITAL_ADMIN")
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
        .allow(null, '')
        .optional(),
      pet_age: Joi.number()
        .integer()
        .min(0)
        .allow(null, '')
        .optional(),
      pet_notes: Joi.string()
        .allow(null, '')
        .optional(),
      pet_photo: Joi.string()
        .allow(null, '')
        .optional(),
      // Allow fields from multer
      avatar: Joi.any(),
      files: Joi.any(),
      uploadedFiles: Joi.any(),
    }).unknown(true);

    const { error } = schema.validate(req.body);
    if (error) {
      // Xóa ảnh đã upload nếu có lỗi validation
      if (req.uploadedFiles) {
        try {
          const deletePromises = [];
          if (req.uploadedFiles.avatar) {
            deletePromises.push(
              cloudinary.uploader.destroy(req.uploadedFiles.avatar.publicId)
            );
          }
          if (req.uploadedFiles.pet_photo) {
            deletePromises.push(
              cloudinary.uploader.destroy(req.uploadedFiles.pet_photo.publicId)
            );
          }
          await Promise.all(deletePromises);
        } catch (deleteError) {
          console.error("Error deleting uploaded files:", deleteError);
        }
      }
      return next(new ApiError(400, error.details[0].message));
    }
    next();
  } catch (error) {
    // Xử lý lỗi và xóa ảnh nếu có
    if (req.uploadedFiles) {
      try {
        const deletePromises = [];
        if (req.uploadedFiles.avatar) {
          deletePromises.push(
            cloudinary.uploader.destroy(req.uploadedFiles.avatar.publicId)
          );
        }
        if (req.uploadedFiles.pet_photo) {
          deletePromises.push(
            cloudinary.uploader.destroy(req.uploadedFiles.pet_photo.publicId)
          );
        }
        await Promise.all(deletePromises);
      } catch (deleteError) {
        console.error("Error deleting uploaded files:", deleteError);
      }
    }
    return next(error);
  }
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
