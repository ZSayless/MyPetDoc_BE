const express = require("express");
const router = express.Router();
const ReportReasonController = require("../controllers/ReportReasonController");
const { validateAuth } = require("../middleware/validateAuth");
const cacheMiddleware = require("../middleware/cacheMiddleware");

// Routes only for ADMIN
router.use(validateAuth(["ADMIN"]));
router.get("/", cacheMiddleware(300), ReportReasonController.getAllReports);
router.get("/:id", cacheMiddleware(300), ReportReasonController.getReportDetail);
router.patch("/:id/resolve", ReportReasonController.resolveReport);
router.delete("/:id/force", ReportReasonController.forceDeleteReport);

module.exports = router;
