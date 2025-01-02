const express = require("express");
const passport = require("passport");
const authController = require("../controllers/authController");
const asyncHandler = require("../utils/asyncHandler");
const {
  validateRegister,
  validateLogin,
} = require("../middleware/validateAuth");

const router = express.Router();

router.post(
  "/register",
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
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login-failed",
  }),
  asyncHandler(authController.googleCallback)
);

router.post(
  "/complete-google-signup",
  asyncHandler(authController.completeGoogleSignup)
);

module.exports = router;
