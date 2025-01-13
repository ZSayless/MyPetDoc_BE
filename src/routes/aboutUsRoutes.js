const express = require("express");
const AboutUsController = require("../controllers/AboutUsController");
const { validateAuth } = require("../middleware/validateAuth");

const router = express.Router();

// Public routes
router.get("/current", AboutUsController.getCurrentAboutUs);

// Routes require admin permission
router.use(validateAuth(["ADMIN"]));
router.get("/version/:version", AboutUsController.getVersion);
router.get("/history", AboutUsController.getVersionHistory);
router.get("/compare", AboutUsController.compareVersions);
router.post("/create", AboutUsController.createNewVersion);
router.patch("/soft-delete/:id", AboutUsController.toggleSoftDelete);
router.delete("/hard-delete/:id", AboutUsController.hardDeleteVersion);

module.exports = router;
