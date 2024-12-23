const ApiError = require("../exceptions/ApiError");
const ContactMessage = require("../models/ContactMessage");
const EmailService = require("./EmailService");

class ContactMessageService {
  // Tạo tin nhắn mới
  async createMessage(messageData, userId = null) {
    try {
      await this.validateMessageData(messageData);
      const dataToCreate = {
        ...messageData,
        status: "pending",
        user_id: messageData.user_id || null,
      };
      const message = await ContactMessage.create(dataToCreate);
      return message;
    } catch (error) {
      console.error("Error creating message:", error);
      throw error;
    }
  }

  // Lấy danh sách tin nhắn với filter và phân trang
  async getMessages(searchParams = {}, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const result = await ContactMessage.search(searchParams, {
        offset,
        limit,
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  // Lấy chi tiết một tin nhắn
  async getMessageById(id) {
    try {
      const message = await ContactMessage.findById(id);
      if (!message) {
        throw new ApiError(404, "Không tìm thấy tin nhắn");
      }
      return message;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật trạng thái tin nhắn
  async updateStatus(id, status, userId) {
    try {
      const validStatuses = ["pending", "processing", "completed", "cancelled"];
      if (!validStatuses.includes(status)) {
        throw new ApiError(400, "Trạng thái không hợp lệ");
      }

      const message = await this.getMessageById(id);

      const updateData = {
        status,
        responded_by: userId,
      };

      return await ContactMessage.update(id, updateData);
    } catch (error) {
      throw error;
    }
  }

  // Phản hồi tin nhắn
  async respondToMessage(id, responseData, userId) {
    try {
      const { response } = responseData;
      if (!response) {
        throw new ApiError(400, "Nội dung phản hồi không được để trống");
      }

      const message = await this.getMessageById(id);

      // Cập nhật thông tin phản hồi
      const updateData = {
        response,
        responded_at: new Date(),
        status: "completed",
      };

      const updatedMessage = await ContactMessage.update(id, updateData);

      // Gửi email phản hồi cho người gửi
      await EmailService.sendContactResponseEmail(message.email, {
        name: message.name,
        subject: message.subject,
        originalMessage: message.message,
        responseText: response,
      });

      return updatedMessage;
    } catch (error) {
      throw error;
    }
  }

  // Xóa tin nhắn (mềm)
  async deleteMessage(id) {
    try {
      await ContactMessage.softDelete(id);
    } catch (error) {
      throw error;
    }
  }

  // Xóa tin nhắn (cứng)
  async hardDeleteMessage(id) {
    try {
      await ContactMessage.hardDelete(id);
    } catch (error) {
      throw error;
    }
  }

  // Validate dữ liệu tin nhắn
  async validateMessageData(data) {
    const errors = [];

    // Validate email
    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push("Email không hợp lệ");
    }

    // Validate tên
    if (!data.name || data.name.trim().length < 2) {
      errors.push("Tên phải có ít nhất 2 ký tự");
    }

    // Validate số điện thoại nếu có
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push("Số điện thoại không hợp lệ");
    }

    // Validate nội dung
    if (!data.message || data.message.trim().length < 10) {
      errors.push("Nội dung tin nhắn phải có ít nhất 10 ký tự");
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

module.exports = new ContactMessageService();
