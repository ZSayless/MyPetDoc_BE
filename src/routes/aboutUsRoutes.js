const express = require("express");
const AboutUsController = require("../controllers/AboutUsController");
const { validateAuth } = require("../middleware/validateAuth");
const cacheMiddleware = require("../middleware/cacheMiddleware");

const router = express.Router();

// Public routes
router.get(
  "/current",
  cacheMiddleware(3600),
  AboutUsController.getCurrentAboutUs
);

// Routes require admin permission
router.use(validateAuth(["ADMIN"]));
router.get(
  "/version/:version",
  cacheMiddleware(1800),
  AboutUsController.getVersion
);
router.get(
  "/history",
  cacheMiddleware(300),
  AboutUsController.getVersionHistory
);
router.get(
  "/compare",
  cacheMiddleware(1800),
  AboutUsController.compareVersions
);
router.post("/create", AboutUsController.createNewVersion);
router.patch("/soft-delete/:id", AboutUsController.toggleSoftDelete);
router.delete("/hard-delete/:id", AboutUsController.hardDeleteVersion);

module.exports = router;
