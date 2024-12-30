const FAQ = require("../models/Faq");
const ApiError = require("../exceptions/ApiError");

class FAQService {
  // Lấy danh sách FAQ có phân trang
  async getFAQs(page = 1, limit = 10, includeDeleted = false) {
    try {
      return await FAQ.findAll(page, limit, includeDeleted);
    } catch (error) {
      throw new ApiError(500, "Lỗi khi lấy danh sách FAQ");
    }
  }

  // Tìm kiếm FAQ
  async searchFAQs(keyword, page = 1, limit = 10) {
    try {
      if (!keyword || keyword.trim().length < 2) {
        throw new ApiError(400, "Từ khóa tìm kiếm phải có ít nhất 2 ký tự");
      }
      return await FAQ.search(keyword.trim(), page, limit);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Lỗi khi tìm kiếm FAQ");
    }
  }

  // Lấy chi tiết FAQ
  async getFAQById(id) {
    try {
      const faq = await FAQ.findById(id);
      if (!faq) {
        throw new ApiError(404, "Không tìm thấy FAQ");
      }
      return faq;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Lỗi khi lấy thông tin FAQ");
    }
  }

  // Tạo FAQ mới
  async createFAQ(data, userId) {
    try {
      // Validate dữ liệu
      await this.validateFAQData(data);

      // Chuẩn bị dữ liệu
      const faqData = {
        ...data,
        created_by: userId,
      };

      // Tạo FAQ mới
      return await FAQ.create(faqData);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Lỗi khi tạo FAQ");
    }
  }

  // Cập nhật FAQ
  async updateFAQ(id, data) {
    try {
      // Kiểm tra FAQ tồn tại
      const existingFAQ = await this.getFAQById(id);

      // Validate dữ liệu
      await this.validateFAQData(data);

      // Cập nhật FAQ
      return await FAQ.update(id, data);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Lỗi khi cập nhật FAQ");
    }
  }

  // Xóa mềm/khôi phục FAQ
  async toggleSoftDelete(id) {
    try {
      const faq = await this.getFAQById(id);
      return await FAQ.toggleSoftDelete(id);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Lỗi khi thay đổi trạng thái FAQ");
    }
  }

  // Xóa vĩnh viễn FAQ
  async hardDelete(id) {
    try {
      const faq = await this.getFAQById(id);
      return await FAQ.hardDelete(id);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Lỗi khi xóa FAQ");
    }
  }

  // Validate dữ liệu FAQ
  async validateFAQData(data) {
    const errors = [];

    // Validate câu hỏi
    if (!data.question) {
      errors.push("Câu hỏi là bắt buộc");
    } else if (data.question.trim().length < 10) {
      errors.push("Câu hỏi phải có ít nhất 10 ký tự");
    }

    // Validate câu trả lời
    if (!data.answer) {
      errors.push("Câu trả lời là bắt buộc");
    } else if (data.answer.trim().length < 10) {
      errors.push("Câu trả lời phải có ít nhất 10 ký tự");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Dữ liệu không hợp lệ", errors);
    }
  }
}

module.exports = new FAQService();
