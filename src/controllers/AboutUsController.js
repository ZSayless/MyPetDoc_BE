const AboutUsService = require("../services/AboutUsService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");

class AboutUsController {
  // Lấy thông tin about us hiện tại
  getCurrentAboutUs = asyncHandler(async (req, res) => {
    const aboutUs = await AboutUsService.getCurrentAboutUs();
    res.json(aboutUs);
  });

  // Tạo phiên bản mới
  createNewVersion = asyncHandler(async (req, res) => {
    const aboutUs = await AboutUsService.createNewVersion(
      req.body,
      req.user.id
    );
    res.status(201).json(aboutUs);
  });

  // Lấy lịch sử phiên bản
  getVersionHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const history = await AboutUsService.getVersionHistory(
      parseInt(page),
      parseInt(limit)
    );
    res.json(history);
  });

  // Lấy một phiên bản cụ thể
  getVersion = asyncHandler(async (req, res) => {
    const { version } = req.params;
    const aboutUs = await AboutUsService.getVersion(parseInt(version));
    res.json(aboutUs);
  });

  // Xóa phiên bản
  toggleSoftDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await AboutUsService.toggleSoftDelete(parseInt(id));
    res.status(204).send();
  });

  // Xóa vĩnh viễn
  hardDeleteVersion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await AboutUsService.hardDelete(parseInt(id));
    res.status(204).send();
  });

  // So sánh hai phiên bản
  compareVersions = asyncHandler(async (req, res) => {
    const { version1, version2 } = req.query;

    if (!version1 || !version2) {
      throw new ApiError(400, "Vui lòng cung cấp đủ hai phiên bản để so sánh");
    }

    const comparison = await AboutUsService.compareVersions(
      parseInt(version1),
      parseInt(version2)
    );
    res.json(comparison);
  });
}

module.exports = new AboutUsController();
