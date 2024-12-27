const express = require("express");
const router = express.Router();
const BannerController = require("../controllers/BannerController");
const { validateAuth } = require("../middleware/validateAuth");
const { handleUploadBannerImages } = require("../middleware/uploadMiddleware");

// Routes công khai
router.get("/active", BannerController.getActiveBanners);

router.get("/:id", BannerController.getBannerById);

// Routes yêu cầu xác thực ADMIN
router.use(validateAuth(["ADMIN"]));
router.get("/", BannerController.getBanners);
router.post("/", handleUploadBannerImages, BannerController.createBanner);
router.put("/:id", handleUploadBannerImages, BannerController.updateBanner);
router.patch("/:id/toggle-active", BannerController.toggleActive);
router.delete("/:id/soft", BannerController.softDelete);
router.delete("/:id/hard", BannerController.hardDelete);

module.exports = router;
