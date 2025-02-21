const FAQService = require("../services/FAQService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const cache = require("../config/redis");

class FAQController {
  // Method to clear cache
  clearFAQCache = async (faqId = null) => {
    try {
      const keys = [
        "cache:/api/faqs",
        "cache:/api/faqs/search",
        "cache:/api/faqs?*",
        "cache:/api/faqs/search?*"
      ];

      // Clear common cache
      for (const key of keys) {
        await cache.del(key);
      }

      // Clear specific FAQ cache if provided
      if (faqId) {
        await cache.del(`cache:/api/faqs/${faqId}`);
      }

    } catch (error) {
      console.error("Error clearing FAQ cache:", error);
    }
  };

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

    // Clear all cache after creating new FAQ
    await this.clearFAQCache();

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

    // Clear cache after updating
    await this.clearFAQCache(id);

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

    // Clear cache after changing status
    await this.clearFAQCache(id);

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

    // Clear cache after hard delete
    await this.clearFAQCache(id);

    res.json({
      status: "success",
      message: "Permanently delete FAQ successful",
    });
  });
}

module.exports = new FAQController();
