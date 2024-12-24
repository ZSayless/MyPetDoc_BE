const AboutUs = require("../models/AboutUs");
const ApiError = require("../exceptions/ApiError");

class AboutUsService {
  // Lấy thông tin about us hiện tại
  async getCurrentAboutUs() {
    try {
      const aboutUs = await AboutUs.getCurrentAboutUs();
      if (!aboutUs) {
        throw new ApiError(404, "Chưa có thông tin about us");
      }
      return aboutUs;
    } catch (error) {
      throw error;
    }
  }

  // Tạo hoặc cập nhật about us
  async createNewVersion(data, userId) {
    try {
      // Validate dữ liệu
      await this.validateAboutUsData(data);

      // Tạo phiên bản mới
      const aboutUs = await AboutUs.createNewVersion(data, userId);
      return aboutUs;
    } catch (error) {
      throw error;
    }
  }

  // Lấy lịch sử phiên bản
  async getVersionHistory(page = 1, limit = 10) {
    try {
      return await AboutUs.getVersionHistory(page, limit);
    } catch (error) {
      throw error;
    }
  }

  // Lấy một phiên bản cụ thể
  async getVersion(version) {
    try {
      const aboutUs = await AboutUs.getVersion(version);
      if (!aboutUs) {
        throw new ApiError(404, "Không tìm thấy phiên bản này");
      }
      return aboutUs;
    } catch (error) {
      throw error;
    }
  }

  // So sánh hai phiên bản
  async compareVersions(version1, version2) {
    try {
      const [v1, v2] = await Promise.all([
        this.getVersion(version1),
        this.getVersion(version2),
      ]);

      // Tạo object chứa sự khác biệt
      const differences = {
        content: this.compareFields(v1.content, v2.content),
        mission: this.compareFields(v1.mission, v2.mission),
        vision: this.compareFields(v1.vision, v2.vision),
        core_values: this.compareFields(v1.core_values, v2.core_values),
      };

      return {
        version1: v1,
        version2: v2,
        differences,
      };
    } catch (error) {
      throw error;
    }
  }

  async toggleSoftDelete(id) {
    try {
      return await AboutUs.toggleSoftDelete(id);
    } catch (error) {
      throw error;
    }
  }

  async hardDelete(id) {
    try {
      return await AboutUs.hardDelete(id);
    } catch (error) {
      throw error;
    }
  }

  // Validate dữ liệu about us
  async validateAboutUsData(data) {
    const errors = [];

    // Kiểm tra content
    if (!data.content || data.content.trim().length < 10) {
      errors.push("Nội dung giới thiệu phải có ít nhất 10 ký tự");
    }

    // Kiểm tra mission (nếu có)
    if (data.mission && data.mission.trim().length < 10) {
      errors.push("Sứ mệnh phải có ít nhất 10 ký tự");
    }

    // Kiểm tra vision (nếu có)
    if (data.vision && data.vision.trim().length < 10) {
      errors.push("Tầm nhìn phải có ít nhất 10 ký tự");
    }

    // Kiểm tra core_values (nếu có)
    if (data.core_values && data.core_values.trim().length < 10) {
      errors.push("Giá trị cốt lõi phải có ít nhất 10 ký tự");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Dữ liệu không hợp lệ", errors);
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

module.exports = new AboutUsService();
