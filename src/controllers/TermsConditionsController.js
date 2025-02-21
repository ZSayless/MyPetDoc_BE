const TermsConditionsService = require("../services/TermsConditionsService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const cache = require("../config/redis");

class TermsConditionsController {
  // Method to clear terms cache
  clearTermsCache = async (versionId = null) => {
    try {
      // Get all keys matching the pattern
      const pattern = "cache:/api/terms*";
      const keys = await new Promise((resolve, reject) => {
        cache.keys(pattern, (err, keys) => {
          if (err) reject(err);
          resolve(keys);
        });
      });

      // Delete each found key
      if (keys.length > 0) {
        await Promise.all(keys.map(key => cache.del(key)));
      }

      // Clear specific version's cache if provided
      if (versionId) {
        await Promise.all([
          cache.del(`cache:/api/terms/version/${versionId}`),
          cache.del(`cache:/api/terms/version/${versionId}?*`)
        ]);
      }

      console.log("Cleared terms & conditions cache:", keys.length, "keys");
    } catch (error) {
      console.error("Error clearing terms & conditions cache:", error);
    }
  };

  // Get current terms
  getCurrentTerms = asyncHandler(async (req, res) => {
    const terms = await TermsConditionsService.getCurrentTerms();
    res.json(terms);
  });

  // Get effective terms at a specific time
  getEffectiveTerms = asyncHandler(async (req, res) => {
    const { date } = req.query;
    let effectiveDate = date ? new Date(date) : new Date();

    if (isNaN(effectiveDate.getTime())) {
      throw new ApiError(400, "Invalid date");
    }

    const terms = await TermsConditionsService.getEffectiveTerms(effectiveDate);
    res.json(terms);
  });

  // Create new version
  createNewVersion = asyncHandler(async (req, res) => {
    const terms = await TermsConditionsService.createNewVersion(
      req.body,
      req.user.id
    );

    // Clear all cache after creating new version
    await this.clearTermsCache();

    res.status(201).json(terms);
  });

  // Get version history
  getVersionHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await TermsConditionsService.getVersionHistory(
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  });

  // Get specific version
  getVersion = asyncHandler(async (req, res) => {
    const terms = await TermsConditionsService.getVersion(req.params.version);
    res.json(terms);
  });

  // Compare two versions
  compareVersions = asyncHandler(async (req, res) => {
    const { version1, version2 } = req.query;

    if (!version1 || !version2) {
      throw new ApiError(400, "Please provide both versions to compare");
    }

    const comparison = await TermsConditionsService.compareVersions(
      parseInt(version1),
      parseInt(version2)
    );
    res.json(comparison);
  });

  // Soft delete/restore
  toggleSoftDelete = asyncHandler(async (req, res) => {
    if (req.user.role !== "ADMIN") {
      throw new ApiError(403, "You are not authorized to perform this action");
    }

    const terms = await TermsConditionsService.toggleSoftDelete(req.params.id);

    // Clear cache of specific version and related caches
    await this.clearTermsCache(req.params.id);

    res.status(200).json({
      status: "success",
      message: terms.is_deleted
        ? "Soft delete version successful"
        : "Restore version successful",
      data: terms,
    });
  });

  // Hard delete
  hardDeleteVersion = asyncHandler(async (req, res) => {
    if (req.user.role !== "ADMIN") {
      throw new ApiError(403, "You are not authorized to perform this action");
    }

    await TermsConditionsService.hardDelete(req.params.id);

    // Clear cache of specific version and related caches
    await this.clearTermsCache(req.params.id);

    res.status(200).json({
      status: "success",
      message: "Hard delete version successful",
    });
  });

  // Update version
  updateVersion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const terms = await TermsConditionsService.updateVersion(
      parseInt(id),
      req.body,
      req.user.id
    );

    // Clear cache of specific version and related caches
    await this.clearTermsCache(id);

    res.json({
      status: "success",
      message: "Update terms version successfully",
      data: terms
    });
  });
}

module.exports = new TermsConditionsController();
