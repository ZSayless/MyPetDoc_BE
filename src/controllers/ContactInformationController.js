const ContactInformationService = require("../services/ContactInformationService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const cache = require("../config/redis");

class ContactInformationController {
  // Method to clear cache
  clearContactCache = async (versionId = null) => {
    try {
      const keys = [
        "cache:/api/contact-info/current",
        "cache:/api/contact-info/history",
        "cache:/api/contact-info/compare"
      ];

      // Clear common cache
      for (const key of keys) {
        await cache.del(key);
      }

      // Clear cache for specific version if provided
      if (versionId) {
        await cache.del(`cache:/api/contact-info/version/${versionId}`);
      }

    } catch (error) {
      console.error("Error clearing contact information cache:", error);
    }
  };

  // Get current contact information
  getCurrentContact = asyncHandler(async (req, res) => {
    const contact = await ContactInformationService.getCurrentContact();
    res.json(contact);
  });

  // Create new version
  createNewVersion = asyncHandler(async (req, res) => {
    const contact = await ContactInformationService.createNewVersion(
      req.body,
      req.user.id
    );

    // Clear all cache after creating new version
    await this.clearContactCache();

    res.status(201).json(contact);
  });

  // Get version history
  getVersionHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await ContactInformationService.getVersionHistory(
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  });

  // Get a specific version
  getVersion = asyncHandler(async (req, res) => {
    const contact = await ContactInformationService.getVersion(
      req.params.version
    );
    res.json(contact);
  });

  // Compare two versions
  compareVersions = asyncHandler(async (req, res) => {
    const { version1, version2 } = req.query;

    if (!version1 || !version2) {
      throw new ApiError(400, "Please provide both versions to compare");
    }

    const comparison = await ContactInformationService.compareVersions(
      parseInt(version1),
      parseInt(version2)
    );
    res.json(comparison);
  });

  // Soft delete/restore
  toggleSoftDelete = asyncHandler(async (req, res) => {
    if (req.user.role !== "ADMIN") {
      throw new ApiError(403, "You are not allowed to perform this action");
    }
    const { id } = req.params;

    const contact = await ContactInformationService.toggleSoftDelete(
      parseInt(id)
    );

    // Clear cache after changing status
    await this.clearContactCache(id);

    res.json(contact);
  });

  // Hard delete
  hardDelete = asyncHandler(async (req, res) => {
    if (req.user.role !== "ADMIN") {
      throw new ApiError(403, "You are not allowed to perform this action");
    }

    await ContactInformationService.hardDelete(req.params.id);

    // Clear cache after hard delete
    await this.clearContactCache(req.params.id);

    res.status(200).json({
      status: "success",
      message: "Permanently delete version successful",
    });
  });

  // Update version
  updateVersion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const contact = await ContactInformationService.updateVersion(
      parseInt(id),
      req.body,
      req.user.id
    );

    // Clear cache after updating
    await this.clearContactCache(id);

    res.json({
      status: "success",
      message: "Update contact version successfully",
      data: contact
    });
  });
}

module.exports = new ContactInformationController();
