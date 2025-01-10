const TermsConditionsService = require("../services/TermsConditionsService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");

class TermsConditionsController {
  // Lấy điều khoản hiện tại
  getCurrentTerms = asyncHandler(async (req, res) => {
    const terms = await TermsConditionsService.getCurrentTerms();
    res.json(terms);
  });

  // Tạo phiên bản mới
  createNewVersion = asyncHandler(async (req, res) => {
    const terms = await TermsConditionsService.createNewVersion(
      req.body,
      req.user.id
    );
    res.status(201).json(terms);
  });

  // Lấy lịch sử phiên bản
  getVersionHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await TermsConditionsService.getVersionHistory(
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  });

  // Lấy một phiên bản cụ thể
  getVersion = asyncHandler(async (req, res) => {
    const terms = await TermsConditionsService.getVersion(req.params.version);
    res.json(terms);
  });

  // Lấy điều khoản có hiệu lực tại một thời điểm
  getEffectiveTerms = asyncHandler(async (req, res) => {
    const { date } = req.query;
    let effectiveDate = date ? new Date(date) : new Date();

    if (isNaN(effectiveDate.getTime())) {
      throw new ApiError(400, "Ngày không hợp lệ");
    }

    const terms = await TermsConditionsService.getEffectiveTerms(effectiveDate);
    res.json(terms);
  });

  // So sánh hai phiên bản
  compareVersions = asyncHandler(async (req, res) => {
    const { version1, version2 } = req.query;

    if (!version1 || !version2) {
      throw new ApiError(400, "Vui lòng cung cấp đủ hai phiên bản để so sánh");
    }

    const comparison = await TermsConditionsService.compareVersions(
      parseInt(version1),
      parseInt(version2)
    );
    res.json(comparison);
  });

  // Xóa mềm/khôi phục
  toggleSoftDelete = asyncHandler(async (req, res) => {
    // Kiểm tra quyền admin
    if (req.user.role !== "ADMIN") {
      throw new ApiError(403, "Bạn không có quyền thực hiện hành động này");
    }

    const terms = await TermsConditionsService.toggleSoftDelete(req.params.id);
    res.status(204).json({
      status: "success",
      message: "Xóa phiên bản thành công",
    });
  });

  // Xóa vĩnh viễn
  hardDeleteVersion = asyncHandler(async (req, res) => {
    // Kiểm tra quyền admin
    if (req.user.role !== "ADMIN") {
      throw new ApiError(403, "Bạn không có quyền thực hiện hành động này");
    }

    await TermsConditionsService.hardDelete(req.params.id);
    res.status(204).json({
      status: "success",
      message: "Xóa vĩnh viễn phiên bản thành công",
    });
  });
}

module.exports = new TermsConditionsController();
