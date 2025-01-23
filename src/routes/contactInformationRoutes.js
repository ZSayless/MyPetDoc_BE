const express = require("express");
const ContactInformationController = require("../controllers/ContactInformationController");
const { validateAuth } = require("../middleware/validateAuth");
const cacheMiddleware = require("../middleware/cacheMiddleware");

const router = express.Router();

// Public routes - no need to login
router.get(
  "/current",
  cacheMiddleware(3600),
  ContactInformationController.getCurrentContact
);

// Routes require admin permission
router.use(validateAuth(["ADMIN"]));
router.get(
  "/version/:version",
  cacheMiddleware(1800),
  ContactInformationController.getVersion
);
router.get(
  "/history",
  cacheMiddleware(300),
  ContactInformationController.getVersionHistory
);
router.get(
  "/compare",
  cacheMiddleware(1800),
  ContactInformationController.compareVersions
);
router.post("/create", ContactInformationController.createNewVersion);
router.patch("/soft-delete/:id", ContactInformationController.toggleSoftDelete);
router.delete("/hard-delete/:id", ContactInformationController.hardDelete);

module.exports = router;
