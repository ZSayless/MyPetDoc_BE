const FAQService = require("../services/FAQService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");

class FAQController {
  // Lấy danh sách FAQ có phân trang
  getFAQs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, includeDeleted = false } = req.query;
    const result = await FAQService.getFAQs(
      parseInt(page),
      parseInt(limit),
      includeDeleted === "true"
    );
    res.json(result);
  });

  // Tìm kiếm FAQ
  searchFAQs = asyncHandler(async (req, res) => {
    const { keyword, page = 1, limit = 10 } = req.query;

    if (!keyword) {
      throw new ApiError(400, "Vui lòng nhập từ khóa tìm kiếm");
    }

    const result = await FAQService.searchFAQs(
      keyword,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  });

  // Lấy chi tiết FAQ
  getFAQById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const faq = await FAQService.getFAQById(parseInt(id));
    res.json(faq);
  });

  // Tạo FAQ mới
  createFAQ = asyncHandler(async (req, res) => {
    const faq = await FAQService.createFAQ(req.body, req.user.id);
    res.status(201).json({
      status: "success",
      message: "Tạo FAQ thành công",
      data: faq,
    });
  });

  // Cập nhật FAQ
  updateFAQ = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const faq = await FAQService.updateFAQ(parseInt(id), req.body);
    res.json({
      status: "success",
      message: "Cập nhật FAQ thành công",
      data: faq,
    });
  });

  // Xóa mềm/khôi phục FAQ
  toggleSoftDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const faq = await FAQService.toggleSoftDelete(parseInt(id));
    res.json({
      status: "success",
      message: `FAQ đã được ${faq.is_deleted ? "xóa" : "khôi phục"}`,
      data: faq,
    });
  });

  // Xóa vĩnh viễn FAQ
  hardDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await FAQService.hardDelete(parseInt(id));
    res.json({
      status: "success",
      message: "Đã xóa vĩnh viễn FAQ",
    });
  });
}

module.exports = new FAQController();
