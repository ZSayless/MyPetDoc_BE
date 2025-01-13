const FAQService = require("../services/FAQService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");

class FAQController {
  // Get list of FAQs with pagination
  getFAQs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, includeDeleted = false } = req.query;
    const result = await FAQService.getFAQs(
      parseInt(page),
      parseInt(limit),
      includeDeleted === "true"
    );
    res.json(result);
  });

  // Search FAQs
  searchFAQs = asyncHandler(async (req, res) => {
    const { keyword, page = 1, limit = 10 } = req.query;

    if (!keyword) {
      throw new ApiError(400, "Please enter a search keyword");
    }

    const result = await FAQService.searchFAQs(
      keyword,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  });

  // Get details of a FAQ
  getFAQById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const faq = await FAQService.getFAQById(parseInt(id));
    res.json(faq);
  });

  // Create new FAQ
  createFAQ = asyncHandler(async (req, res) => {
    const faq = await FAQService.createFAQ(req.body, req.user.id);
    res.status(201).json({
      status: "success",
      message: "Create FAQ successful",
      data: faq,
    });
  });

  // Update FAQ
  updateFAQ = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const faq = await FAQService.updateFAQ(parseInt(id), req.body);
    res.json({
      status: "success",
      message: "Update FAQ successful",
      data: faq,
    });
  });

  // Soft delete/restore FAQ
  toggleSoftDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const faq = await FAQService.toggleSoftDelete(parseInt(id));
    res.json({
      status: "success",
      message: `FAQ has been ${faq.is_deleted ? "deleted" : "restored"}`,
      data: faq,
    });
  });

  // Hard delete FAQ
  hardDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await FAQService.hardDelete(parseInt(id));
    res.json({
      status: "success",
      message: "Permanently delete FAQ successful",
    });
  });
}

module.exports = new FAQController();
