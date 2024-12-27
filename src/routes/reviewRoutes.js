const express = require("express");
const router = express.Router();
const ReviewController = require("../controllers/ReviewController");
const { validateAuth } = require("../middleware/validateAuth");
const { handleUploadReviewImages } = require("../middleware/uploadMiddleware");

// Routes không cần auth
router.get("/", ReviewController.getReviews);
router.get("/:id", ReviewController.getReviewById);
router.get("/hospital/:hospitalId/stats", ReviewController.getHospitalStats);
// Lấy danh sách review theo hospital
router.get("/hospital/:hospitalId", ReviewController.getHospitalReviews);

// Routes cần auth
router.use(validateAuth(["GENERAL_USER", "HOSPITAL_ADMIN", "ADMIN"]));
// Kiểm tra có thể review
router.get("/hospital/:hospitalId/can-review", ReviewController.canUserReview);
// Tạo và quản lý review
router.post("/", handleUploadReviewImages, ReviewController.createReview);
// Báo cáo review
router.post("/:id/report", ReviewController.reportReview);
// cập nhật review
router.put("/:id", handleUploadReviewImages, ReviewController.updateReview);
// Toggle xóa mềm (user hoặc admin)
router.patch("/:id/toggle-delete", ReviewController.toggleSoftDelete);

// Lấy reviews của user hiện tại
router.get("/user/me", ReviewController.getUserReviews);

// Admin routes
router.use(validateAuth(["ADMIN"]));
router.delete("/:id/hard", ReviewController.hardDeleteReview);

module.exports = router;
