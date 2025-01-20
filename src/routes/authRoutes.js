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
  (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
      if (err) {
        console.error("Google auth error:", err);
        return res.send(`
          <script>
            window.opener.postMessage({
              status: "error",
              message: "Authentication error: " + ${JSON.stringify(err.message)}
            }, "${process.env.CLIENT_URL}");
            window.close();
          </script>
        `);
      }

      if (!user) {
        console.error("No user data:", info);
        return res.send(`
          <script>
            window.opener.postMessage({
              status: "error",
              message: "Authentication failed: " + ${JSON.stringify(
                info?.message || "No user data"
              )}
            }, "${process.env.CLIENT_URL}");
            window.close();
          </script>
        `);
      }

      try {
        const token = user.generateAuthToken();
        const userData = {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          avatar: user.avatar,
        };

        console.log("Auth successful:", { userData });

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
                    user: ${JSON.stringify(userData)},
                    token: "${token}"
                  }
                }, "${process.env.CLIENT_URL}");
                window.close();
              } else {
                document.body.innerHTML = 'Authentication successful. You can close this window.';
              }
            </script>
          </body>
          </html>
        `);
      } catch (error) {
        console.error("Token generation error:", error);
        res.send(`
          <script>
            window.opener.postMessage({
              status: "error",
              message: "Token generation failed: " + ${JSON.stringify(
                error.message
              )}
            }, "${process.env.CLIENT_URL}");
            window.close();
          </script>
        `);
      }
    })(req, res, next);
  }
);

router.post(
  "/complete-google-signup",
  asyncHandler(authController.completeGoogleSignup)
);

module.exports = router;
