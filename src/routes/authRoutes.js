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

      // Kiểm tra xem có phải user mới không
      if (userData.isNewUser) {
        const responseData = {
          status: "pending_role",
          message: "Vui lòng chọn loại tài khoản",
          data: {
            profile: userData.profile
          }
        };
        return res.redirect(
          `${process.env.CLIENT_URL}/auth/callback?data=${encodeURIComponent(
            JSON.stringify(responseData)
          )}`
        );
      }

      // Kiểm tra trạng thái tài khoản
      if (userData.is_locked) {
        const errorData = {
          status: "error",
          message: "Tài khoản đã bị khóa"
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
        message: "Đăng nhập thành công",
        data: {
          user: {
            id: userData.id,
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role,
            avatar: userData.avatar || null
          },
          token
        }
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
        message: error.message || "Xác thực thất bại"
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