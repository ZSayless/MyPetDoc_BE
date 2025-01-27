const express = require("express");
const router = express.Router();
const BannerController = require("../controllers/BannerController");
const { validateAuth } = require("../middleware/validateAuth");
const { handleUploadBannerImages } = require("../middleware/uploadMiddleware");
const cacheMiddleware = require("../middleware/cacheMiddleware");

// Public routes
router.get("/active", cacheMiddleware(3600), BannerController.getActiveBanners);
router.get("/:id", cacheMiddleware(1800), BannerController.getBannerById);

// Routes require admin authentication
router.use(validateAuth(["ADMIN"]));
router.get("/", cacheMiddleware(300), BannerController.getBanners);

// Routes that modify data - không cache
router.post("/", handleUploadBannerImages, BannerController.createBanner);
router.put("/:id", handleUploadBannerImages, BannerController.updateBanner);
router.patch("/:id/toggle-active", BannerController.toggleActive);
router.patch("/:id/soft", BannerController.softDelete);
router.delete("/:id/hard", BannerController.hardDelete);

module.exports = router;
