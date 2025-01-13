const FAQ = require("../models/Faq");
const ApiError = require("../exceptions/ApiError");

class FAQService {
  // Get list of FAQs with pagination
  async getFAQs(page = 1, limit = 10, includeDeleted = false) {
    try {
      return await FAQ.findAll(page, limit, includeDeleted);
    } catch (error) {
      throw new ApiError(500, "Error fetching FAQs");
    }
  }

  // Search FAQs
  async searchFAQs(keyword, page = 1, limit = 10) {
    try {
      if (!keyword || keyword.trim().length < 2) {
        throw new ApiError(400, "Search keyword must be at least 2 characters");
      }
      return await FAQ.search(keyword.trim(), page, limit);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Error searching FAQs");
    }
  }

  // Get details of a FAQ
  async getFAQById(id) {
    try {
      const faq = await FAQ.findById(id);
      if (!faq) {
        throw new ApiError(404, "FAQ not found");
      }
      return faq;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Error fetching FAQ details");
    }
  }

  // Create new FAQ
  async createFAQ(data, userId) {
    try {
      // Validate data
      await this.validateFAQData(data);

      // Prepare data
      const faqData = {
        ...data,
        created_by: userId,
      };

      // Create new FAQ
      return await FAQ.create(faqData);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Error creating FAQ");
    }
  }

  // Update FAQ
  async updateFAQ(id, data) {
    try {
      // Check if FAQ exists
      const existingFAQ = await this.getFAQById(id);

      // Validate data
      await this.validateFAQData(data);

      // Update FAQ
      return await FAQ.update(id, data);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Error updating FAQ");
    }
  }

  // Soft delete/restore FAQ
  async toggleSoftDelete(id) {
    try {
      const faq = await this.getFAQById(id);
      return await FAQ.toggleSoftDelete(id);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Error toggling FAQ status");
    }
  }

  // Hard delete FAQ
  async hardDelete(id) {
    try {
      const faq = await this.getFAQById(id);
      return await FAQ.hardDelete(id);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Error hard deleting FAQ");
    }
  }

  // Validate FAQ data
  async validateFAQData(data) {
    const errors = [];

    // Validate câu hỏi
    if (!data.question) {
      errors.push("Question is required");
    } else if (data.question.trim().length < 10) {
      errors.push("Question must be at least 10 characters");
    }

    // Validate câu trả lời
    if (!data.answer) {
      errors.push("Answer is required");
    } else if (data.answer.trim().length < 10) {
      errors.push("Answer must be at least 10 characters");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Invalid data", errors);
    }
  }
}

module.exports = new FAQService();
