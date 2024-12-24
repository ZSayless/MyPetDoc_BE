const TermsConditions = require("../models/TermsConditions");
const ApiError = require("../exceptions/ApiError");

class TermsConditionsService {
  // Lấy điều khoản hiện tại
  async getCurrentTerms() {
    try {
      const terms = await TermsConditions.getCurrentTerms();
      if (!terms) {
        throw new ApiError(404, "Chưa có điều khoản nào được tạo");
      }
      return terms;
    } catch (error) {
      throw error;
    }
  }

  // Tạo phiên bản mới
  async createNewVersion(data, userId) {
    try {
      // Validate dữ liệu
      await this.validateTermsData(data);

      // Lấy ngày hiện tại (chỉ lấy ngày, không lấy giờ)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Lấy ngày hiệu lực (chỉ lấy ngày, không lấy giờ)
      const effectiveDate = new Date(data.effective_date);
      effectiveDate.setHours(0, 0, 0, 0);

      // Kiểm tra ngày hiệu lực
      if (effectiveDate < today) {
        throw new ApiError(
          400,
          "Ngày hiệu lực phải lớn hơn hoặc bằng ngày hiện tại"
        );
      }

      // Tạo phiên bản mới
      const terms = await TermsConditions.createNewVersion(data, userId);
      return terms;
    } catch (error) {
      throw error;
    }
  }

  // Lấy lịch sử phiên bản
  async getVersionHistory(page = 1, limit = 10) {
    try {
      return await TermsConditions.getVersionHistory(page, limit);
    } catch (error) {
      throw error;
    }
  }

  // Lấy một phiên bản cụ thể
  async getVersion(version) {
    try {
      const terms = await TermsConditions.getVersion(version);
      if (!terms) {
        throw new ApiError(404, "Không tìm thấy phiên bản này");
      }
      return terms;
    } catch (error) {
      throw error;
    }
  }

  // Lấy điều khoản có hiệu lực tại một thời điểm
  async getEffectiveTerms(date) {
    try {
      const terms = await TermsConditions.getEffectiveTerms(date);
      if (!terms) {
        throw new ApiError(
          404,
          "Không có điều khoản nào có hiệu lực tại thời điểm này"
        );
      }
      return terms;
    } catch (error) {
      throw error;
    }
  }

  // Xóa mềm/khôi phục
  async toggleSoftDelete(id) {
    try {
      // Kiểm tra xem có phải phiên bản hiện tại không
      const currentTerms = await TermsConditions.getCurrentTerms();
      if (currentTerms && currentTerms.id === parseInt(id)) {
        throw new ApiError(400, "Không thể xóa phiên bản đang có hiệu lực");
      }

      return await TermsConditions.toggleSoftDelete(id);
    } catch (error) {
      throw error;
    }
  }

  // Xóa vĩnh viễn
  async hardDelete(id) {
    try {
      // Kiểm tra xem có phải phiên bản hiện tại không
      const currentTerms = await TermsConditions.getCurrentTerms();
      if (currentTerms && currentTerms.id === parseInt(id)) {
        throw new ApiError(400, "Không thể xóa phiên bản đang có hiệu lực");
      }

      return await TermsConditions.hardDelete(id);
    } catch (error) {
      throw error;
    }
  }

  // Validate dữ liệu
  async validateTermsData(data) {
    const errors = [];

    // Kiểm tra tiêu đề
    if (!data.title || data.title.trim().length < 5) {
      errors.push("Tiêu đề phải có ít nhất 5 ký tự");
    }

    // Kiểm tra nội dung
    if (!data.content || data.content.trim().length < 10) {
      errors.push("Nội dung phải có ít nhất 10 ký tự");
    }

    // Kiểm tra ngày hiệu lực
    if (!data.effective_date) {
      errors.push("Ngày hiệu lực là bắt buộc");
    } else {
      const effectiveDate = new Date(data.effective_date);
      if (isNaN(effectiveDate.getTime())) {
        errors.push("Ngày hiệu lực không hợp lệ");
      }
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Dữ liệu không hợp lệ", errors);
    }
  }

  // So sánh hai phiên bản
  async compareVersions(version1, version2) {
    try {
      const [v1, v2] = await Promise.all([
        this.getVersion(version1),
        this.getVersion(version2),
      ]);

      const differences = {
        title: this.compareFields(v1.title, v2.title),
        content: this.compareFields(v1.content, v2.content),
        effective_date: this.compareFields(
          v1.effective_date.toISOString().split("T")[0],
          v2.effective_date.toISOString().split("T")[0]
        ),
      };

      return {
        version1: {
          version: v1.version,
          last_updated_by_name: v1.last_updated_by_name,
        },
        version2: {
          version: v2.version,
          last_updated_by_name: v2.last_updated_by_name,
        },
        differences,
      };
    } catch (error) {
      throw error;
    }
  }

  // So sánh hai trường dữ liệu
  compareFields(field1, field2) {
    if (field1 === field2) return null;
    return {
      old: field1,
      new: field2,
    };
  }
}

module.exports = new TermsConditionsService();
