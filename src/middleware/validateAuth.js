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

const validateLogin = async (req, res, next) => {
  try {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new ApiError(400, error.details[0].message);
    }

    // Kiểm tra tài khoản tồn tại và trạng thái
    const user = await User.findByEmail(req.body.email);
    if (user) {
      console.log(user);
      if (user.is_deleted) {
        throw new ApiError(401, "Account is deleted. Please contact admin for support");
      }

      if (!user.is_active) {
        throw new ApiError(401, "Account is not activated. Please check your email to activate");
      }

      if (user.is_locked) {
        throw new ApiError(401, "Account is locked. Please contact admin for support");
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Thêm validation cho complete-google-signup
const validateGoogleSignup = async (req, res, next) => {
  try {
    if (!req.body) {
      throw new ApiError(400, "No data provided");
    }

    // Kiểm tra email tồn tại và trạng thái của tài khoản
    const existingUser = await User.findByEmail(req.body.email);
    if (existingUser) {
      // Xóa ảnh đã upload nếu có
      if (req.uploadedFiles) {
        try {
          if (req.uploadedFiles.avatar) {
            await cloudinary.uploader.destroy(req.uploadedFiles.avatar.publicId);
          }
          if (req.uploadedFiles.pet_photo) {
            await cloudinary.uploader.destroy(req.uploadedFiles.pet_photo.publicId);
          }
        } catch (error) {
          console.error("Error deleting uploaded files:", error);
        }
      }

      // Kiểm tra các trường hợp đặc biệt
      if (existingUser.is_deleted) {
        throw new ApiError(400, "Account is deleted. Please contact admin for support");
      }

      if (!existingUser.is_active) {
        throw new ApiError(400, "Account is not activated. Please check your email to activate");
      }

      if (existingUser.is_locked) {
        throw new ApiError(400, "Account is locked. Please contact admin for support");
      }

      if (existingUser.google_id) {
        throw new ApiError(400, "This email is already registered with a Google account");
      }
    }

    // Validate các trường dữ liệu
    const schema = Joi.object({
      email: Joi.string().email().required(),
      full_name: Joi.string().required(),
      phone_number: Joi.string()
        .regex(/^[0-9]{10}$/)
        .required(),
      google_id: Joi.string().required(),
      role: Joi.string()
        .valid("GENERAL_USER", "HOSPITAL_ADMIN")
        .required(),
      pet_type: Joi.string()
        .valid("DOG", "CAT", "BIRD", "RABBIT", "FISH", "HAMSTER", "REPTILE", "OTHER")
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
      avatar: Joi.any(),
      files: Joi.any(),
      uploadedFiles: Joi.any(),
    }).unknown(true);

    const { error } = schema.validate(req.body);
    if (error) {
      // Xóa ảnh đã upload nếu có lỗi validation
      if (req.uploadedFiles) {
        try {
          if (req.uploadedFiles.avatar) {
            await cloudinary.uploader.destroy(req.uploadedFiles.avatar.publicId);
          }
          if (req.uploadedFiles.pet_photo) {
            await cloudinary.uploader.destroy(req.uploadedFiles.pet_photo.publicId);
          }
        } catch (deleteError) {
          console.error("Error deleting uploaded files:", deleteError);
        }
      }
      throw new ApiError(400, error.details[0].message);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateRegister,
  validateLogin,
  validateAuth,
  validateGoogleSignup,
};
