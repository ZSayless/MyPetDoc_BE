const express = require("express");
const ContactInformationController = require("../controllers/ContactInformationController");
const { validateAuth } = require("../middleware/validateAuth");

const router = express.Router();

// Public routes - no need to login
router.get("/current", ContactInformationController.getCurrentContact);

// Routes require admin permission
router.use(validateAuth(["ADMIN"]));
router.get("/version/:version", ContactInformationController.getVersion);
router.get("/history", ContactInformationController.getVersionHistory);
router.get("/compare", ContactInformationController.compareVersions);
router.post("/create", ContactInformationController.createNewVersion);
router.patch("/soft-delete/:id", ContactInformationController.toggleSoftDelete);
router.delete("/hard-delete/:id", ContactInformationController.hardDelete);

module.exports = router;
