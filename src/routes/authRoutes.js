const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const asyncHandler = require("../utils/asyncHandler");
const {
  validateRegister,
  validateLogin,
} = require("../middleware/validateAuth");

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

module.exports = router;
