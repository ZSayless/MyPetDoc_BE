const User = require("../models/User");
const ApiError = require("../exceptions/ApiError");
const emailService = require("../services/emailService");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary");

class AuthController {
  // Register account
  register = async (req, res) => {
    try {
      const { email, password, full_name, role = "GENERAL_USER" } = req.body;

      // Validate data
      await this.validateUserData({ email, password, full_name });

      // Check if email already exists
      if (await User.isEmailTaken(email)) {
        // Nếu có ảnh đã upload, xóa ảnh
        if (req.uploadedFile) {
          try {
            await cloudinary.uploader.destroy(req.uploadedFile.publicId);
          } catch (error) {
            console.error("Error deleting image:", error);
          }
        }
        throw new ApiError(400, "Email already used");
      }

      // Handle avatar
      let userAvatar = "default-avatar.png";
      if (req.uploadedFile) {
        userAvatar = req.uploadedFile.path;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      try {
        // Create new user
        const user = await User.create({
          email,
          password: hashedPassword,
          full_name,
          role,
          is_active: false,
          verification_token: verificationToken,
          verification_expires: verificationExpires,
          avatar: userAvatar,
        });

        // Send verification email
        await emailService.sendVerificationEmail(email, verificationToken);

        // Remove sensitive information
        delete user.password;
        delete user.verification_token;
        delete user.verification_expires;

        res.status(201).json({
          status: "success",
          message:
            "Register successfully. Please check your email to verify your account.",
          data: user,
        });
      } catch (error) {
        // If creating user fails, delete uploaded image
        if (req.uploadedFile) {
          try {
            await cloudinary.uploader.destroy(req.uploadedFile.publicId);
          } catch (deleteError) {
            console.error("Error deleting image:", deleteError);
          }
        }
        throw error;
      }

    } catch (error) {
      // If there is an error and a file is uploaded, delete the file on Cloudinary
      if (req.uploadedFile) {
        try {
          await cloudinary.uploader.destroy(req.uploadedFile.publicId);
        } catch (deleteError) {
          console.error("Error deleting image:", deleteError);
        }
      }
      throw error;
    }
  };

  validateUserData = async (data) => {
    const errors = [];

    // Validate email
    if (!data.email) {
      errors.push("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push("Invalid email");
    }

    // Validate password
    if (!data.password) {
      errors.push("Password is required");
    } else if (data.password.length < 6) {
      errors.push("Password must be at least 6 characters");
    } else if (!/[A-Z]/.test(data.password)) {
      errors.push("Password must contain at least 1 uppercase letter");
    } else if (!/[0-9]/.test(data.password)) {
      errors.push("Password must contain at least 1 number");
    }

    // Validate full name
    if (!data.full_name || data.full_name.trim().length < 2) {
      errors.push("Full name must be at least 2 characters");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Invalid data", errors);
    }
  };

  // Login
  async login(req, res) {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      throw new ApiError(401, "Email or password is incorrect");
    }

    // Check password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new ApiError(401, "Email or password is incorrect");
    }

    // Check if account is locked
    if (user.is_locked) {
      throw new ApiError(401, "Account is locked");
    }

    // Check if account is active
    if (!user.is_active) {
      // Check if verification token has expired
      if (
        !user.verification_token ||
        new Date() > new Date(user.verification_expires)
      ) {
        // Create new verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Update new token
        await User.update(user.id, {
          verification_token: verificationToken,
          verification_expires: verificationExpires,
        });

        // Send verification email again
        await emailService.sendVerificationEmail(user.email, verificationToken);

        throw new ApiError(
          401,
          "Verification code has expired. We have sent a new verification code to your email."
        );
      }

      throw new ApiError(
        401,
        "Account is not active. Please check your email to verify your account."
      );
    }

    // Create token and remove sensitive information
    const token = user.generateAuthToken();
    delete user.password;
    delete user.verification_token;
    delete user.verification_expires;
    delete user.reset_password_token;
    delete user.reset_password_expires;

    res.json({
      status: "success",
      data: {
        user,
        token,
      },
    });
  }

  async verifyEmail(req, res) {
    const { token } = req.params;

    const user = await User.findOne({
      verification_token: token,
      is_active: false,
    });

    if (!user) {
      throw new ApiError(400, "Invalid token or expired");
    }

    if (new Date() > new Date(user.verification_expires)) {
      throw new ApiError(400, "Token expired");
    }

    await User.update(user.id, {
      is_active: true,
      verification_token: null,
      verification_expires: null,
    });

    res.json({
      status: "success",
      message: "Email verification successful",
    });
  }

  async forgotPassword(req, res) {
    const { email } = req.body;
    const user = await User.findByEmail(email);

    if (!user) {
      throw new ApiError(404, "Email does not exist");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await User.update(user.id, {
      reset_password_token: resetToken,
      reset_password_expires: resetExpires,
    });

    await emailService.sendResetPasswordEmail(email, resetToken);

    res.json({
      status: "success",
      message: "Reset password email has been sent",
    });
  }

  async resetPassword(req, res) {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      reset_password_token: token,
    });

    if (!user) {
      throw new ApiError(400, "Invalid token or expired");
    }

    if (new Date() > new Date(user.reset_password_expires)) {
      throw new ApiError(400, "Token expired");
    }

    await User.update(user.id, {
      password: await bcrypt.hash(password, 10),
      reset_password_token: null,
      reset_password_expires: null,
    });

    res.json({
      status: "success",
      message: "Reset password successful",
    });
  }

  async googleCallback(req, res) {
    try {
      const userData = req.user;

      if (userData.isNewUser) {
        // If it's a new user, return pending role status
        res.json({
          status: "pending_role",
          message: "Please choose account type",
          data: {
            profile: userData.profile,
          },
        });
        return;
      }

      const token = userData.generateAuthToken();
      res.json({
        status: "success",
        message: "Login successful",
        data: {
          user: {
            id: userData.id,
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role,
            avatar: userData.avatar,
          },
          token,
        },
      });
    } catch (error) {
      console.error("Google callback error:", error);
      res.status(error.statusCode || 500).json({
        status: "error",
        message: error.message || "Authentication failed",
      });
    }
  }

  // Add new method to complete Google signup
  async completeGoogleSignup(req, res) {
    const { email, full_name, google_id, avatar, role } = req.body;

    if (!["GENERAL_USER", "HOSPITAL_ADMIN"].includes(role)) {
      throw new ApiError(400, "Invalid role");
    }

    // Check if email already exists
    if (await User.isEmailTaken(email)) {
      throw new ApiError(400, "Email already used");
    }

    const randomPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    console.log("User data before create:", {
      email,
      full_name,
      google_id,
      avatar,
      role,
      hashedPassword,
    });

    // Create new user with default values for required fields
    let user = await User.create({
      email,
      full_name,
      google_id: google_id || null, // Allow null if not provided
      avatar: avatar || null, // Allow null if not provided
      role,
      is_active: true,
      is_locked: false,
      password: hashedPassword,
      verification_token: null, // Add required fields
      verification_expires: null,
      reset_password_token: null,
      reset_password_expires: null,
      hospital_id: null, // If HOSPITAL_ADMIN, can update later
    });

    // Get full user information after creation
    user = await User.findById(user.id);

    if (!user) {
      throw new ApiError(500, "Error creating account");
    }

    const token = user.generateAuthToken();

    // Remove sensitive information
    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar: user.avatar,
      is_active: user.is_active,
      created_at: user.created_at,
    };

    res.json({
      status: "success",
      message: "Register successful",
      data: {
        user: userResponse,
        token,
      },
    });
  }
}

module.exports = new AuthController();
