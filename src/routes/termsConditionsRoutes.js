const express = require("express");
const TermsConditionsController = require("../controllers/TermsConditionsController");
const { validateAuth } = require("../middleware/validateAuth");

const router = express.Router();

// Public routes
router.get("/current", TermsConditionsController.getCurrentTerms);
router.get("/effective", TermsConditionsController.getEffectiveTerms);

// Routes require admin permission
router.use(validateAuth(["ADMIN"]));
router.get("/version/:version", TermsConditionsController.getVersion);
router.get("/history", TermsConditionsController.getVersionHistory);
router.get("/compare", TermsConditionsController.compareVersions);
router.post("/create", TermsConditionsController.createNewVersion);
router.patch("/soft-delete/:id", TermsConditionsController.toggleSoftDelete);
router.delete("/hard-delete/:id", TermsConditionsController.hardDeleteVersion);

module.exports = router;
