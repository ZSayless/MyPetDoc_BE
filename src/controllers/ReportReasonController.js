const ReportReasonService = require("../services/ReportReasonService");
const asyncHandler = require("../utils/asyncHandler");

class ReportReasonController {
  // Lấy danh sách báo cáo
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

  // Lấy chi tiết báo cáo
  getReportDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const report = await ReportReasonService.getReportDetail(parseInt(id));

    res.json({
      status: "success",
      data: report,
    });
  });

  // Đánh dấu báo cáo đã xử lý
  resolveReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await ReportReasonService.resolveReport(parseInt(id));

    res.json({
      status: "success",
      ...result,
    });
  });
}

module.exports = new ReportReasonController();
