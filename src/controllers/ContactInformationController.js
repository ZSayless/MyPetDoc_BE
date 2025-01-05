const ContactInformationService = require("../services/ContactInformationService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");

class ContactInformationController {
  // Lấy thông tin liên hệ hiện tại
  getCurrentContact = asyncHandler(async (req, res) => {
    const contact = await ContactInformationService.getCurrentContact();
    res.json(contact);
  });

  // Tạo phiên bản mới
  createNewVersion = asyncHandler(async (req, res) => {
    const contact = await ContactInformationService.createNewVersion(
      req.body,
      req.user.id
    );
    res.status(201).json(contact);
  });

  // Lấy lịch sử phiên bản
  getVersionHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await ContactInformationService.getVersionHistory(
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  });

  // Lấy một phiên bản cụ thể
  getVersion = asyncHandler(async (req, res) => {
    const contact = await ContactInformationService.getVersion(
      req.params.version
    );
    res.json(contact);
  });

  // So sánh hai phiên bản
  compareVersions = asyncHandler(async (req, res) => {
    const { version1, version2 } = req.query;

    if (!version1 || !version2) {
      throw new ApiError(400, "Vui lòng cung cấp đủ hai phiên bản để so sánh");
    }

    const comparison = await ContactInformationService.compareVersions(
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
    const { id } = req.params;

    const contact = await ContactInformationService.toggleSoftDelete(
      parseInt(id)
    );
    res.json(contact);
  });

  // Xóa vĩnh viễn
  hardDelete = asyncHandler(async (req, res) => {
    // Kiểm tra quyền admin
    if (req.user.role !== "ADMIN") {
      throw new ApiError(403, "Bạn không có quyền thực hiện hành động này");
    }

    await ContactInformationService.hardDelete(req.params.id);
    res.status(204).send();
  });
}

module.exports = new ContactInformationController();
