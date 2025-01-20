const express = require("express");
const passport = require("passport");
const authController = require("../controllers/AuthController");
const asyncHandler = require("../utils/asyncHandler");
const {
  validateRegister,
  validateLogin,
} = require("../middleware/validateAuth");
const { handleUploadAvatar } = require("../middleware/uploadMiddleware");
const crypto = require("crypto");
const router = express.Router();

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
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    try {
      const token = req.user.generateAuthToken();
      const user = {
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.full_name,
        role: req.user.role,
        avatar: req.user.avatar,
      };

      // Kiểm tra window.opener tồn tại
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                status: "success",
                message: "Login successful", 
                data: {
                  user: ${JSON.stringify(user)},
                  token: "${token}"
                }
              }, "${process.env.CLIENT_URL}");
              window.close();
            } else {
              // Fallback nếu không có opener
              document.body.innerHTML = 'Authentication successful. You can close this window.';
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      res.status(500).send(`
        <script>
          if (window.opener) {
            window.opener.postMessage({
              status: "error",
              message: "Authentication failed"
            }, "${process.env.CLIENT_URL}");
            window.close();
          } else {
            document.body.innerHTML = 'Authentication failed.';
          }
        </script>
      `);
    }
  }
);

router.post(
  "/complete-google-signup",
  asyncHandler(authController.completeGoogleSignup)
);

module.exports = router;
