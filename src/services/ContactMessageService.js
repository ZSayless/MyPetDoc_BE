const ApiError = require("../exceptions/ApiError");
const ContactMessage = require("../models/ContactMessage");
const EmailService = require("./EmailService");

class ContactMessageService {
  // Create new message
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

  // Get list of messages with filter and pagination
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

  // Get details of a message
  async getMessageById(id) {
    try {
      const message = await ContactMessage.findById(id);
      if (!message) {
        throw new ApiError(404, "Message not found");
      }
      return message;
    } catch (error) {
      throw error;
    }
  }

  // Update message status
  async updateStatus(id, status, userId) {
    try {
      const validStatuses = ["pending", "processing", "completed", "cancelled"];
      if (!validStatuses.includes(status)) {
        throw new ApiError(400, "Invalid status");
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

  // Respond to message
  async respondToMessage(id, responseData, userId) {
    try {
      const { response } = responseData;
      if (!response) {
        throw new ApiError(400, "Response content cannot be empty");
      }

      const message = await this.getMessageById(id);

      // Update response information
      const updateData = {
        response,
        responded_at: new Date(),
        status: "completed",
      };

      const updatedMessage = await ContactMessage.update(id, updateData);

      // Send response email to sender
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

  // Soft delete message
  async deleteMessage(id) {
    try {
      await ContactMessage.softDelete(id);
    } catch (error) {
      throw error;
    }
  }

  // Hard delete message
  async hardDeleteMessage(id) {
    try {
      await ContactMessage.hardDelete(id);
    } catch (error) {
      throw error;
    }
  }

  // Validate message data
  async validateMessageData(data) {
    const errors = [];

    // Validate email
    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push("Invalid email");
    }

    // Validate name
    if (!data.name || data.name.trim().length < 2) {
      errors.push("Name must be at least 2 characters");
    }

    // Validate phone number if provided
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push("Invalid phone number");
    }

    // Validate message content
    if (!data.message || data.message.trim().length < 10) {
      errors.push("Message content must be at least 10 characters");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Invalid data", errors);
    }
  }

  // Check if email is valid
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Check if phone number is valid
  isValidPhone(phone) {
    const phoneRegex = /^[0-9]{10,11}$/;
    return phoneRegex.test(phone);
  }
}

module.exports = new ContactMessageService();
