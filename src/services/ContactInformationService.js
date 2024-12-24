const ContactInformation = require("../models/ContactInformation");
const ApiError = require("../exceptions/ApiError");

class ContactInformationService {
  // Lấy thông tin liên hệ hiện tại
  async getCurrentContact() {
    try {
      const contact = await ContactInformation.getCurrentContact();
      if (!contact) {
        throw new ApiError(404, "Chưa có thông tin liên hệ nào được tạo");
      }
      return contact;
    } catch (error) {
      throw error;
    }
  }

  // Tạo phiên bản mới
  async createNewVersion(data, userId) {
    try {
      // Validate dữ liệu
      await this.validateContactData(data);

      // Tạo phiên bản mới
      const contact = await ContactInformation.createNewVersion(data, userId);
      return contact;
    } catch (error) {
      throw error;
    }
  }

  // Lấy lịch sử phiên bản
  async getVersionHistory(page = 1, limit = 10) {
    try {
      return await ContactInformation.getVersionHistory(page, limit);
    } catch (error) {
      throw error;
    }
  }

  // Lấy một phiên bản cụ thể
  async getVersion(version) {
    try {
      const contact = await ContactInformation.getVersion(version);
      if (!contact) {
        throw new ApiError(404, "Không tìm thấy phiên bản này");
      }
      return contact;
    } catch (error) {
      throw error;
    }
  }

  // Xóa mềm/khôi phục
  async toggleSoftDelete(id) {
    try {
      // Kiểm tra xem có phải phiên bản hiện tại không
      const currentContact = await ContactInformation.getCurrentContact();
      if (currentContact && currentContact.id === parseInt(id)) {
        throw new ApiError(400, "Không thể xóa phiên bản đang sử dụng");
      }

      return await ContactInformation.toggleSoftDelete(id);
    } catch (error) {
      throw error;
    }
  }

  // Xóa vĩnh viễn
  async hardDelete(id) {
    try {
      // Kiểm tra xem có phải phiên bản hiện tại không
      const currentContact = await ContactInformation.getCurrentContact();
      if (currentContact && currentContact.id === parseInt(id)) {
        throw new ApiError(400, "Không thể xóa phiên bản đang sử dụng");
      }

      return await ContactInformation.hardDelete(id);
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

      return await ContactInformation.compareVersions(version1, version2);
    } catch (error) {
      throw error;
    }
  }

  // Validate dữ liệu
  async validateContactData(data) {
    const errors = [];

    // Validate email
    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push("Email không hợp lệ");
    }

    // Validate số điện thoại
    if (!data.phone || !this.isValidPhone(data.phone)) {
      errors.push("Số điện thoại không hợp lệ");
    }

    // Validate địa chỉ
    if (!data.address || data.address.trim().length < 10) {
      errors.push("Địa chỉ phải có ít nhất 10 ký tự");
    }

    // Validate giờ hỗ trợ
    if (!data.support_hours || data.support_hours.trim().length < 5) {
      errors.push("Giờ hỗ trợ phải có ít nhất 5 ký tự");
    }

    // Validate mô tả hỗ trợ
    if (
      data.support_description &&
      data.support_description.trim().length < 10
    ) {
      errors.push("Mô tả hỗ trợ phải có ít nhất 10 ký tự");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Dữ liệu không hợp lệ", errors);
    }
  }

  // Kiểm tra email hợp lệ
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Kiểm tra số điện thoại hợp lệ
  isValidPhone(phone) {
    const phoneRegex = /^[0-9]{10,11}$/;
    return phoneRegex.test(phone);
  }
}

module.exports = new ContactInformationService();
