const express = require("express");
const router = express.Router();
const ReviewController = require("../controllers/ReviewController");
const { validateAuth } = require("../middleware/validateAuth");
const { handleUploadReviewImages } = require("../middleware/uploadMiddleware");

// Public routes (no need to login)
router.get("/", ReviewController.getReviews);
router.get("/:id", ReviewController.getReviewById);
router.get("/hospital/:hospitalId/stats", ReviewController.getHospitalStats);
// Get list of reviews by hospital
router.get("/hospital/:hospitalId", ReviewController.getHospitalReviews);

// Routes require login
router.use(validateAuth(["GENERAL_USER", "HOSPITAL_ADMIN", "ADMIN"]));
// Check if user can review
router.get("/hospital/:hospitalId/can-review", ReviewController.canUserReview);
// Create and manage reviews
router.post("/", handleUploadReviewImages, ReviewController.createReview);
// Report review
router.post("/:id/report", ReviewController.reportReview);
// Update review
router.put("/:id", handleUploadReviewImages, ReviewController.updateReview);
// Toggle soft delete (user or admin)
router.patch("/:id/toggle-delete", ReviewController.toggleSoftDelete);

// Get reviews of current user
router.get("/user/me", ReviewController.getUserReviews);

// Admin routes
router.use(validateAuth(["ADMIN"]));
router.delete("/:id/hard", ReviewController.hardDeleteReview);

module.exports = router;
