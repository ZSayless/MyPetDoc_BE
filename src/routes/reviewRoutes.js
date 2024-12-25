const express = require("express");
const router = express.Router();
const ReviewController = require("../controllers/ReviewController");
const { validateAuth } = require("../middleware/validateAuth");

// Routes không cần auth
router.get("/", ReviewController.getReviews);
router.get("/:id", ReviewController.getReviewById);
router.get("/hospital/:hospitalId/stats", ReviewController.getHospitalStats);

// Routes cần auth
router.use(validateAuth(["GENERAL_USER", "HOSPITAL_ADMIN"]));
// Kiểm tra có thể review
router.get("/hospital/:hospitalId/can-review", ReviewController.canUserReview);
// Tạo review mới
router.post("/", ReviewController.createReview);
// Báo cáo review
router.post("/:id/report", ReviewController.reportReview);
// cập nhật review
router.put("/:id", ReviewController.updateReview);
// Toggle xóa mềm (user hoặc admin)
router.patch("/:id/toggle-delete", ReviewController.toggleSoftDelete);
// Xóa vĩnh viễn (chỉ admin)
router.delete(
  "/:id",
  validateAuth(["HOSPITAL_ADMIN"]),
  ReviewController.hardDelete
);
// Lấy danh sách review theo hospital
router.get("/hospital/:hospitalId", ReviewController.getHospitalReviews);

module.exports = router;
