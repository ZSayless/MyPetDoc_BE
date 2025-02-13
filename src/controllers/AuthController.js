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
      const {
        email,
        password,
        full_name,
        phone_number,
        role = "GENERAL_USER",
        pet_type,
        pet_age,
        pet_notes,
      } = req.body;

      // Validate data
      await this.validateUserData({ email, password, full_name, phone_number });

      // Check if email already exists
      if (await User.isEmailTaken(email)) {
        // Xóa ảnh đã upload nếu có lỗi
        if (req.uploadedFiles) {
          try {
            if (req.uploadedFiles.avatar) {
              await cloudinary.uploader.destroy(
                req.uploadedFiles.avatar.publicId
              );
            }
            if (req.uploadedFiles.pet_photo) {
              await cloudinary.uploader.destroy(
                req.uploadedFiles.pet_photo.publicId
              );
            }
          } catch (error) {
            console.error("Error deleting images:", error);
          }
        }
        throw new ApiError(400, "Email already used");
      }

      // Process avatar and pet_photo from req.uploadedFiles
      console.log("Uploaded files:", req.uploadedFiles); // Debug log

      let userAvatar = "default-avatar.png";
      let petPhoto = null;

      if (req.uploadedFiles) {
        if (req.uploadedFiles.avatar) {
          userAvatar = req.uploadedFiles.avatar.path;
          console.log("Setting avatar path:", userAvatar); // Debug log
        }
        if (req.uploadedFiles.pet_photo) {
          petPhoto = req.uploadedFiles.pet_photo.path;
          console.log("Setting pet photo path:", petPhoto); // Debug log
        }
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      try {
        // Create new user with correct image paths
        const user = await User.create({
          email,
          password: hashedPassword,
          full_name,
          phone_number,
          role,
          is_active: false,
          verification_token: verificationToken,
          verification_expires: verificationExpires,
          avatar: userAvatar,
          pet_type: role === "GENERAL_USER" ? pet_type : null,
          pet_age: role === "GENERAL_USER" ? pet_age : null,
          pet_photo: role === "GENERAL_USER" ? petPhoto : null,
          pet_notes: role === "GENERAL_USER" ? pet_notes : null,
        });

        // Send verification email
        await emailService.sendVerificationEmail(email, verificationToken);

        // Get full user data after creation
        const createdUser = await User.findById(user.id);

        // Remove sensitive information
        const userResponse = {
          ...createdUser,
          password: undefined,
          verification_token: undefined,
          verification_expires: undefined,
        };

        res.status(201).json({
          status: "success",
          message:
            "Register successfully. Please check your email to verify your account.",
          data: userResponse,
        });
      } catch (error) {
        // If creating user fails, delete uploaded images
        if (req.uploadedFiles) {
          try {
            if (req.uploadedFiles.avatar) {
              await cloudinary.uploader.destroy(
                req.uploadedFiles.avatar.publicId
              );
            }
            if (req.uploadedFiles.pet_photo) {
              await cloudinary.uploader.destroy(
                req.uploadedFiles.pet_photo.publicId
              );
            }
          } catch (deleteError) {
            console.error("Error deleting images:", deleteError);
          }
        }
        throw error;
      }
    } catch (error) {
      // If there is an error and files were uploaded, delete them
      if (req.uploadedFiles) {
        try {
          if (req.uploadedFiles.avatar) {
            await cloudinary.uploader.destroy(
              req.uploadedFiles.avatar.publicId
            );
          }
          if (req.uploadedFiles.pet_photo) {
            await cloudinary.uploader.destroy(
              req.uploadedFiles.pet_photo.publicId
            );
          }
        } catch (deleteError) {
          console.error("Error deleting images:", deleteError);
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

    // Validate phone number
    if (!data.phone_number) {
      errors.push("Phone number is required");
    } else if (!/^[0-9]{10}$/.test(data.phone_number)) {
      errors.push("Invalid phone number");
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
            phone_number: userData.phone_number || null,
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
    try {
      console.log("Request body:", req.body);
      console.log("Uploaded files:", req.uploadedFiles);

      const {
        email,
        full_name,
        phone_number,
        google_id,
        role,
        pet_type,
        pet_age,
        pet_notes,
        avatar: googleAvatarUrl,
      } = req.body;


      // Validate required fields
      if (!email || !full_name || !phone_number || !role) {
        // Xóa ảnh đã upload nếu có lỗi
        if (req.uploadedFiles) {
          try {
            if (req.uploadedFiles.avatar) {
              await cloudinary.uploader.destroy(
                req.uploadedFiles.avatar.publicId
              );
            }
            if (req.uploadedFiles.pet_photo) {
              await cloudinary.uploader.destroy(
                req.uploadedFiles.pet_photo.publicId
              );
            }
          } catch (error) {
            console.error("Error deleting images:", error);
          }
        }
        throw new ApiError(
          400,
          "Missing required fields: email, full_name, phone_number, role"
        );
      }

      // Get avatar and pet photo paths from uploaded files
      let avatarPath = req.uploadedFiles?.avatar?.path || googleAvatarUrl;
      let petPhotoPath = req.uploadedFiles?.pet_photo?.path || null;

      // Create random password for Google signup
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      // Create new user với các trường pet optional
      const userData = {
        email,
        full_name,
        phone_number,
        google_id: google_id || null,
        avatar: avatarPath,
        role,
        is_active: true,
        is_locked: false,
        password: hashedPassword,
        verification_token: null,
        verification_expires: null,
        reset_password_token: null,
        reset_password_expires: null,
        hospital_id: null,
        pet_type: pet_type || null,
        pet_age: pet_age || null,
        pet_photo: role === "GENERAL_USER" ? petPhotoPath : null,
        pet_notes: pet_notes || null,
      };

      console.log("Creating user with data:", userData);

      let user = await User.create(userData);

      if (!user) {
        throw new ApiError(500, "Error creating account");
      }

      // Get full user data
      user = await User.findById(user.id);
      const token = user.generateAuthToken();

      // Remove sensitive information
      const userResponse = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone_number: user.phone_number,
        avatar: user.avatar,
        is_active: user.is_active,
        created_at: user.created_at,
        pet_type: user.pet_type,
        pet_age: user.pet_age,
        pet_photo: user.pet_photo,
        pet_notes: user.pet_notes,
      };

      res.json({
        status: "success",
        message: "Register successful",
        data: {
          user: userResponse,
          token,
        },
      });
    } catch (error) {
      // Delete uploaded images if there is an error
      if (req.uploadedFiles) {
        try {
          if (req.uploadedFiles.avatar) {
            await cloudinary.uploader.destroy(
              req.uploadedFiles.avatar.publicId
            );
          }
          if (req.uploadedFiles.pet_photo) {
            await cloudinary.uploader.destroy(
              req.uploadedFiles.pet_photo.publicId
            );
          }
        } catch (deleteError) {
          console.error("Error deleting images:", deleteError);
        }
      }
      console.error("Complete Google signup error:", error);
      throw error;
    }
  }
}

module.exports = new AuthController();
