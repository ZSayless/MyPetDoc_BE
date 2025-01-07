const express = require("express");
const router = express.Router();
const FavoriteController = require("../controllers/FavoriteController");
const { validateAuth } = require("../middleware/validateAuth");

// Tất cả các routes yêu cầu đăng nhập
router.use(validateAuth());

// Toggle favorite một bệnh viện
router.post("/:hospitalId", FavoriteController.toggleFavorite);

// Kiểm tra user đã favorite bệnh viện chưa
router.get("/check/:hospitalId", FavoriteController.checkUserFavorite);

// Lấy danh sách bệnh viện yêu thích của user hiện tại
router.get("/user/hospitals", FavoriteController.getUserFavorites);

// Lấy số lượng favorite của user hiện tại
router.get("/user/count", FavoriteController.getUserFavoriteCount);

// Routes công khai (vẫn yêu cầu đăng nhập)
router.use(validateAuth(["ADMIN", "HOSPITAL_ADMIN"]));
// Lấy danh sách user đã favorite một bệnh viện
router.get(
  "/hospital/:hospitalId/users",
  FavoriteController.getHospitalFavorites
);

// Lấy số lượng favorite của một bệnh viện
router.get(
  "/hospital/:hospitalId/count",
  FavoriteController.getHospitalFavoriteCount
);

// Lấy danh sách favorite mới nhất (có thể giới hạn quyền ADMIN nếu cần)
router.get("/latest", FavoriteController.getLatestFavorites);

module.exports = router;
