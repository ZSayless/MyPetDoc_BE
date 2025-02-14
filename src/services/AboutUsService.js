const AboutUs = require("../models/AboutUs");
const ApiError = require("../exceptions/ApiError");

class AboutUsService {
  // Get current about us
  async getCurrentAboutUs() {
    try {
      const aboutUs = await AboutUs.getCurrentAboutUs();
      if (!aboutUs) {
        throw new ApiError(404, "No about us found");
      }
      return aboutUs;
    } catch (error) {
      throw error;
    }
  }

  // Create or update about us
  async createNewVersion(data, userId) {
    try {
      // Validate data
      await this.validateAboutUsData(data);

      // Create new version
      const aboutUs = await AboutUs.createNewVersion(data, userId);
      return aboutUs;
    } catch (error) {
      throw error;
    }
  }

  // Get version history
  async getVersionHistory(page = 1, limit = 10) {
    try {
      return await AboutUs.getVersionHistory(page, limit);
    } catch (error) {
      throw error;
    }
  }

  // Get a specific version
  async getVersion(version) {
    try {
      const aboutUs = await AboutUs.getVersion(version);
      if (!aboutUs) {
        throw new ApiError(404, "Version not found");
      }
      return aboutUs;
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

      // Create object containing differences
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

  // Validate about us data
  async validateAboutUsData(data) {
    const errors = [];

    // Check content
    if (!data.content || data.content.trim().length < 10) {
      errors.push("Content must be at least 10 characters");
    }

    // Check mission (if exists)
    if (data.mission && data.mission.trim().length < 10) {
      errors.push("Mission must be at least 10 characters");
    }

    // Check vision (if exists)
    if (data.vision && data.vision.trim().length < 10) {
      errors.push("Vision must be at least 10 characters");
    }

    // Check core_values (if exists)
    if (data.core_values && data.core_values.trim().length < 10) {
      errors.push("Core values must be at least 10 characters");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Invalid data", errors);
    }
  }

  // Compare two fields
  compareFields(field1, field2) {
    if (field1 === field2) return null;
    return {
      old: field1,
      new: field2,
    };
  }

  // Update a specific version
  async updateVersion(id, data, userId) {
    try {
      // Validate data
      await this.validateAboutUsData(data);

      // Kiểm tra version tồn tại
      const existingVersion = await AboutUs.findById(id);
      if (!existingVersion) {
        throw new ApiError(404, "Version not found");
      }

      // Cập nhật dữ liệu
      const updateData = {
        ...data,
        last_updated_by: userId,
        updated_at: new Date()
      };

      const updatedAboutUs = await AboutUs.update(id, updateData);
      return updatedAboutUs;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AboutUsService();
