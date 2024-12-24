const express = require("express");
const TermsConditionsController = require("../controllers/TermsConditionsController");
const { validateAuth } = require("../middleware/validateAuth");

const router = express.Router();

// Routes công khai
router.get("/current", TermsConditionsController.getCurrentTerms);
router.get("/effective", TermsConditionsController.getEffectiveTerms);

// Routes yêu cầu quyền admin
router.use(validateAuth(["HOSPITAL_ADMIN"]));
router.get("/version/:version", TermsConditionsController.getVersion);
router.get("/history", TermsConditionsController.getVersionHistory);
router.get("/compare", TermsConditionsController.compareVersions);
router.post("/create", TermsConditionsController.createNewVersion);
router.patch("/soft-delete/:id", TermsConditionsController.toggleSoftDelete);
router.delete("/hard-delete/:id", TermsConditionsController.hardDeleteVersion);

module.exports = router;
