const ReportReasonService = require("../services/ReportReasonService");
const asyncHandler = require("../utils/asyncHandler");

class ReportReasonController {
  // Get list of reports
  getAllReports = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, resolved, reportType } = req.query;

    const filters = {
      resolved: resolved === "true" ? 1 : resolved === "false" ? 0 : undefined,
      reportType: reportType,
    };

    const result = await ReportReasonService.getAllReports(
      parseInt(page),
      parseInt(limit),
      filters
    );

    res.json({
      status: "success",
      ...result,
    });
  });

  // Get report details
  getReportDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const report = await ReportReasonService.getReportDetail(parseInt(id));

    res.json({
      status: "success",
      data: report,
    });
  });

  // Mark report as resolved
  resolveReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await ReportReasonService.resolveReport(parseInt(id));

    res.json({
      status: "success",
      ...result,
    });
  });

  // Force delete report
  forceDeleteReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    await ReportReasonService.forceDeleteReport(parseInt(id));

    res.json({
      status: "success",
      message: "Report permanently deleted"
    });
  });
}

module.exports = new ReportReasonController();
