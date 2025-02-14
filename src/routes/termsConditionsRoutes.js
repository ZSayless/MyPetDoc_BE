const express = require("express");
const TermsConditionsController = require("../controllers/TermsConditionsController");
const { validateAuth } = require("../middleware/validateAuth");
const cacheMiddleware = require("../middleware/cacheMiddleware");

const router = express.Router();

// Public routes
router.get(
  "/current",
  cacheMiddleware(3600),
  TermsConditionsController.getCurrentTerms
);
router.get(
  "/effective",
  cacheMiddleware(3600),
  TermsConditionsController.getEffectiveTerms
);

// Routes require admin permission
router.use(validateAuth(["ADMIN"]));
router.get(
  "/version/:version",
  cacheMiddleware(1800),
  TermsConditionsController.getVersion
);
router.get(
  "/history",
  TermsConditionsController.getVersionHistory
);
router.get(
  "/compare",
  cacheMiddleware(1800),
  TermsConditionsController.compareVersions
);
router.post("/create", TermsConditionsController.createNewVersion);
router.patch("/soft-delete/:id", TermsConditionsController.toggleSoftDelete);
router.delete("/hard-delete/:id", TermsConditionsController.hardDeleteVersion);
router.put("/update/:id", TermsConditionsController.updateVersion);

module.exports = router;
