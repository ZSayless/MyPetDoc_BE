const express = require("express");
const passport = require("passport");
const authController = require("../controllers/AuthController");
const asyncHandler = require("../utils/asyncHandler");
const {
  validateRegister,
  validateLogin,
  validateGoogleSignup,
} = require("../middleware/validateAuth");
const { handleUploadAvatar } = require("../middleware/uploadMiddleware");
const router = express.Router();
const User = require("../models/User");

router.post(
  "/register",
  handleUploadAvatar,
  validateRegister,
  asyncHandler(authController.register)
);
router.post("/login", validateLogin, asyncHandler(authController.login));
router.get("/verify-email/:token", asyncHandler(authController.verifyEmail));
router.post("/forgot-password", asyncHandler(authController.forgotPassword));
router.post(
  "/reset-password/:token",
  asyncHandler(authController.resetPassword)
);

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res) => {
    try {
      const userData = req.user;
      console.log("User data in callback:", userData);

      // If it's a new user
      if (userData.isNewUser) {
        const profileData = {
          status: "pending_role",
          data: {
            profile: {
              email: userData.email,
              full_name: userData.full_name,
              google_id: userData.google_id,
              avatar: userData.avatar,
              phone_number: userData.phone_number,
            },
          },
        };

        console.log("Redirecting new user with profile:", profileData);
        return res.redirect(
          `${process.env.CLIENT_URL}/auth/callback?data=${encodeURIComponent(
            JSON.stringify(profileData)
          )}`
        );
      }

      // Check account status for existing user
      const isActive = Buffer.isBuffer(userData.is_active)
        ? userData.is_active[0] === 1
        : Boolean(userData.is_active);
      const isLocked = Buffer.isBuffer(userData.is_locked)
        ? userData.is_locked[0] === 1
        : Boolean(userData.is_locked);
      const isDeleted = Buffer.isBuffer(userData.is_deleted)
        ? userData.is_deleted[0] === 1
        : Boolean(userData.is_deleted);

      if (isLocked || isDeleted || !isActive) {
        const errorData = {
          status: "error",
          message: isLocked
            ? "Account is locked"
            : isDeleted
            ? "Account is deleted"
            : "Account is not active",
          code: isLocked
            ? "ACCOUNT_LOCKED"
            : isDeleted
            ? "ACCOUNT_DELETED"
            : "ACCOUNT_INACTIVE",
        };
        return res.redirect(
          `${process.env.CLIENT_URL}/auth/callback?data=${encodeURIComponent(
            JSON.stringify(errorData)
          )}`
        );
      }

      // Valid user
      const token = userData.generateAuthToken();
      const successData = {
        status: "success",
        message: "Login successful",
        data: {
          user: {
            id: userData.id,
            email: userData.email,
            full_name: userData.full_name,
            phone_number: userData.phone_number,
            role: userData.role,
            hospital_id: userData.hospital_id || null,
            avatar: userData.avatar || null,
            is_active: true,
            is_locked: false,
            is_deleted: false,
          },
          token,
        },
      };

      return res.redirect(
        `${process.env.CLIENT_URL}/auth/callback?data=${encodeURIComponent(
          JSON.stringify(successData)
        )}`
      );
    } catch (error) {
      console.error("Google callback error:", error);
      const errorData = {
        status: "error",
        message: error.message || "Authentication failed",
        code: "AUTH_ERROR",
      };
      return res.redirect(
        `${process.env.CLIENT_URL}/auth/callback?data=${encodeURIComponent(
          JSON.stringify(errorData)
        )}`
      );
    }
  }
);

router.post(
  "/complete-google-signup",
  handleUploadAvatar,
  validateGoogleSignup,
  asyncHandler(authController.completeGoogleSignup)
);

module.exports = router;
