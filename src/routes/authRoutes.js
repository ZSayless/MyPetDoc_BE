const express = require("express");
const passport = require("passport");
const authController = require("../controllers/AuthController");
const asyncHandler = require("../utils/asyncHandler");
const {
  validateRegister,
  validateLogin,
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

      // Chuyển đổi Buffer thành Boolean
      const isActive = Buffer.isBuffer(userData.is_active)
        ? userData.is_active[0] === 1
        : Boolean(userData.is_active);
      const isLocked = Buffer.isBuffer(userData.is_locked)
        ? userData.is_locked[0] === 1
        : Boolean(userData.is_locked);
      const isDeleted = Buffer.isBuffer(userData.is_deleted)
        ? userData.is_deleted[0] === 1
        : Boolean(userData.is_deleted);

      // Kiểm tra trạng thái tài khoản
      if (isLocked) {
        const errorData = {
          status: "error",
          message: "Account is locked",
          code: "ACCOUNT_LOCKED",
        };
        return res.redirect(
          `${process.env.CLIENT_URL}/auth/callback?data=${encodeURIComponent(
            JSON.stringify(errorData)
          )}`
        );
      }
      if (isDeleted) {
        const errorData = {
          status: "error",
          message: "Account is deleted",
          code: "ACCOUNT_DELETED",
        };
        return res.redirect(
          `${process.env.CLIENT_URL}/auth/callback?data=${encodeURIComponent(
            JSON.stringify(errorData)
          )}`
        );
      }

      if (!isActive) {
        const errorData = {
          status: "error",
          message: "Account is not active",
          code: "ACCOUNT_INACTIVE",
        };
        return res.redirect(
          `${process.env.CLIENT_URL}/auth/callback?data=${encodeURIComponent(
            JSON.stringify(errorData)
          )}`
        );
      }

      // User hợp lệ
      const token = userData.generateAuthToken();
      const successData = {
        status: "success",
        message: "Login successful",
        data: {
          user: {
            id: userData.id,
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role,
            avatar: userData.avatar || null,
            is_locked: false,
            is_deleted: false,
            is_active: true,
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
  asyncHandler(authController.completeGoogleSignup)
);

module.exports = router;
