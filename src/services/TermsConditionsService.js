const TermsConditions = require("../models/TermsConditions");
const ApiError = require("../exceptions/ApiError");

class TermsConditionsService {
  // Get current terms
  async getCurrentTerms() {
    try {
      const terms = await TermsConditions.getCurrentTerms();
      if (!terms) {
        throw new ApiError(404, "No terms created");
      }
      return terms;
    } catch (error) {
      throw error;
    }
  }

  // Create new version
  async createNewVersion(data, userId) {
    try {
      // Validate data
      await this.validateTermsData(data);

      // Get current date (only date, no time)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get effective date (only date, no time)
      const effectiveDate = new Date(data.effective_date);
      effectiveDate.setHours(0, 0, 0, 0);

      // Check effective date
      if (effectiveDate < today) {
        throw new ApiError(
          400,
          "Effective date must be greater than or equal to today"
        );
      }

      // Create new version
      const terms = await TermsConditions.createNewVersion(data, userId);
      return terms;
    } catch (error) {
      throw error;
    }
  }

  // Get version history
  async getVersionHistory(page = 1, limit = 10) {
    try {
      return await TermsConditions.getVersionHistory(page, limit);
    } catch (error) {
      throw error;
    }
  }

  // Get a specific version
  async getVersion(version) {
    try {
      const terms = await TermsConditions.getVersion(version);
      if (!terms) {
        throw new ApiError(404, "Version not found");
      }
      return terms;
    } catch (error) {
      throw error;
    }
  }

  // Get terms effective at a specific date
  async getEffectiveTerms(date) {
    try {
      const terms = await TermsConditions.getEffectiveTerms(date);
      if (!terms) {
        throw new ApiError(
          404,
          "No terms effective at this time"
        );
      }
      return terms;
    } catch (error) {
      throw error;
    }
  }

  // Soft delete/restore
  async toggleSoftDelete(id) {
    try {
      return await TermsConditions.toggleSoftDelete(id);
    } catch (error) {
      throw error;
    }
  }

  // Hard delete
  async hardDelete(id) {
    try {
      // Check if it is the current version
      const currentTerms = await TermsConditions.getCurrentTerms();
      if (currentTerms && currentTerms.id === parseInt(id)) {
        throw new ApiError(400, "Cannot delete the current version");
      }

      return await TermsConditions.hardDelete(id);
    } catch (error) {
      throw error;
    }
  }

  // Validate data
  async validateTermsData(data) {
    const errors = [];

    // Check title
    if (!data.title || data.title.trim().length < 5) {
      errors.push("Title must be at least 5 characters");
    }

    // Check content
    if (!data.content || data.content.trim().length < 10) {
      errors.push("Content must be at least 10 characters");
    }

    // Check effective date
    if (!data.effective_date) {
      errors.push("Effective date is required");
    } else {
      const effectiveDate = new Date(data.effective_date);
      if (isNaN(effectiveDate.getTime())) {
        errors.push("Effective date is invalid");
      }
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Invalid data", errors);
    }
  }

  // Compare two versions
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

  // Compare two fields
  compareFields(field1, field2) {
    if (field1 === field2) return null;
    return {
      old: field1,
      new: field2,
    };
  }
}

module.exports = new TermsConditionsService();
