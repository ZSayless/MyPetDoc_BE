const ContactInformation = require("../models/ContactInformation");
const ApiError = require("../exceptions/ApiError");

class ContactInformationService {
  // Get current contact information
  async getCurrentContact() {
    try {
      const contact = await ContactInformation.getCurrentContact();
      if (!contact) {
        throw new ApiError(404, "No contact information created");
      }
      return contact;
    } catch (error) {
      throw error;
    }
  }

  // Create new version
  async createNewVersion(data, userId) {
    try {
      // Validate data
      await this.validateContactData(data);

      // Create new version
      const contact = await ContactInformation.createNewVersion(data, userId);
      return contact;
    } catch (error) {
      throw error;
    }
  }

  // Get version history
  async getVersionHistory(page = 1, limit = 10) {
    try {
      return await ContactInformation.getVersionHistory(page, limit);
    } catch (error) {
      throw error;
    }
  }

  // Get a specific version
  async getVersion(version) {
    try {
      const contact = await ContactInformation.getVersion(version);
      if (!contact) {
        throw new ApiError(404, "Version not found");
      }
      return contact;
    } catch (error) {
      throw error;
    }
  }

  // Soft delete/restore
  async toggleSoftDelete(id) {
    try {
      // Check if it is the current version
      // const currentContact = await ContactInformation.getCurrentContact();
      // if (currentContact && currentContact.id === parseInt(id)) {
      //   throw new ApiError(400, "Cannot delete current version");
      // }

      return await ContactInformation.toggleSoftDelete(id);
    } catch (error) {
      throw error;
    }
  }

  // Hard delete
  async hardDelete(id) {
    try {
      // Check if it is the current version
      // const currentContact = await ContactInformation.getCurrentContact();
      // if (currentContact && currentContact.id === parseInt(id)) {
      //   throw new ApiError(400, "Cannot delete current version");
      // }

      return await ContactInformation.hardDelete(id);
    } catch (error) {
      throw error;
    }
  }

  // Compare two versions
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

  // Validate data
  async validateContactData(data) {
    const errors = [];

    // Validate email
    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push("Invalid email");
    }

    // Validate phone number
    if (!data.phone || !this.isValidPhone(data.phone)) {
      errors.push("Invalid phone number");
    }

    // Validate address
    if (!data.address || data.address.trim().length < 10) {
      errors.push("Address must be at least 10 characters");
    }

    // Validate support hours
    if (!data.support_hours || data.support_hours.trim().length < 5) {
      errors.push("Support hours must be at least 5 characters");
    }

    // Validate support description
    if (
      data.support_description &&
      data.support_description.trim().length < 10
    ) {
      errors.push("Support description must be at least 10 characters");
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

  // Update version
  async updateVersion(id, data, userId) {
    try {
      // Validate dữ liệu
      await this.validateContactData(data);

      // Kiểm tra version tồn tại
      const existingContact = await ContactInformation.findById(id);
      if (!existingContact) {
        throw new ApiError(404, "Contact version not found");
      }

      // Kiểm tra xem có phải version hiện tại không
      const currentContact = await ContactInformation.getCurrentContact();
      if (currentContact && currentContact.id === parseInt(id)) {
        // Kiểm tra năm của ngày hiệu lực nếu có
        if (data.effective_date) {
          const currentYear = new Date().getFullYear();
          const effectiveDate = new Date(data.effective_date);
          
          if (effectiveDate.getFullYear() !== currentYear) {
            throw new ApiError(
              400,
              `Effective date must be in the current year (${currentYear})`
            );
          }
        }
      }

      // Cập nhật dữ liệu
      const updateData = {
        ...data,
        last_updated_by: userId,
        updated_at: new Date()
      };

      const updatedContact = await ContactInformation.update(id, updateData);
      return updatedContact;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ContactInformationService();
