const express = require("express");
const router = express.Router();
const ReviewController = require("../controllers/ReviewController");
const { validateAuth } = require("../middleware/validateAuth");
const { handleUploadReviewImages } = require("../middleware/uploadMiddleware");
const cacheMiddleware = require("../middleware/cacheMiddleware");

// Public routes (no need to login)
router.get("/", cacheMiddleware(300), ReviewController.getReviews);
router.get("/:id", cacheMiddleware(300), ReviewController.getReviewById);
router.get(
  "/hospital/:hospitalId/stats",
  cacheMiddleware(1800),
  ReviewController.getHospitalStats
);
// Get list of reviews by hospital
router.get(
  "/hospital/:hospitalId",
  cacheMiddleware(300),
  ReviewController.getHospitalReviews
);

// Routes require login
router.use(validateAuth(["GENERAL_USER", "HOSPITAL_ADMIN", "ADMIN"]));
// Check if user can review
router.get(
  "/hospital/:hospitalId/can-review",
  cacheMiddleware(60),
  ReviewController.canUserReview
);
// Create and manage reviews
router.post("/", handleUploadReviewImages, ReviewController.createReview);
// Report review
router.post("/:id/report", ReviewController.reportReview);
// Update review
router.put("/:id", handleUploadReviewImages, ReviewController.updateReview);
// Toggle soft delete (user or admin)
router.patch("/:id/toggle-delete", ReviewController.toggleSoftDelete);

// Get reviews of current user
router.get("/user/me", cacheMiddleware(60), ReviewController.getUserReviews);

// Admin routes
router.use(validateAuth(["ADMIN"]));
router.delete("/:id/hard", ReviewController.hardDeleteReview);

// Route dành cho HOSPITAL_ADMIN và ADMIN
router.post(
  '/:id/reply', 
  validateAuth(['HOSPITAL_ADMIN', 'ADMIN']),
  ReviewController.replyToReview
);

module.exports = router;
