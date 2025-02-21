const ReportReasonService = require("../services/ReportReasonService");
const asyncHandler = require("../utils/asyncHandler");
const cache = require("../config/redis");
const { promisify } = require('util');

class ReportReasonController {
  // Method to clear report cache
  clearReportCache = async (reportId = null) => {
    try {
      // Promisify redis commands
      const keysAsync = promisify(cache.keys).bind(cache);
      const delAsync = promisify(cache.del).bind(cache);
      
      // Get all keys matching the pattern
      const pattern = "cache:/api/reports*";
      const keys = await keysAsync(pattern);

      // Delete each found key
      if (keys.length > 0) {
        await Promise.all(keys.map(key => delAsync(key)));
      }

      // Clear specific report's cache if provided
      if (reportId) {
        await Promise.all([
          delAsync(`cache:/api/reports/${reportId}`),
          delAsync(`cache:/api/reports/${reportId}?*`)
        ]);
      }

      console.log("Cleared report reason cache:", keys.length, "keys");
    } catch (error) {
      console.error("Error clearing report reason cache:", error);
    }
  };

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

    // Clear cache after resolve
    await this.clearReportCache(id);

    res.json({
      status: "success",
      ...result,
    });
  });

  // Force delete report
  forceDeleteReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    await ReportReasonService.forceDeleteReport(parseInt(id));

    // Clear cache after delete
    await this.clearReportCache(id);

    res.json({
      status: "success",
      message: "Report permanently deleted"
    });
  });
}

module.exports = new ReportReasonController();
