const express = require("express");
const router = express.Router();
const ReportReasonController = require("../controllers/ReportReasonController");
const { validateAuth } = require("../middleware/validateAuth");

// Routes chỉ cho ADMIN
router.use(validateAuth(["ADMIN"]));
router.get("/", ReportReasonController.getAllReports);
router.get("/:id", ReportReasonController.getReportDetail);
router.patch("/:id/resolve", ReportReasonController.resolveReport);

module.exports = router;
