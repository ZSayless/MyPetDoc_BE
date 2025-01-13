const AboutUsService = require("../services/AboutUsService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");

class AboutUsController {
  // Get current about us
  getCurrentAboutUs = asyncHandler(async (req, res) => {
    const aboutUs = await AboutUsService.getCurrentAboutUs();
    res.json(aboutUs);
  });

  // Create new version
  createNewVersion = asyncHandler(async (req, res) => {
    const aboutUs = await AboutUsService.createNewVersion(
      req.body,
      req.user.id
    );
    res.status(201).json(aboutUs);
  });

  // Get version history
  getVersionHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const history = await AboutUsService.getVersionHistory(
      parseInt(page),
      parseInt(limit)
    );
    res.json(history);
  });

  // Get a specific version
  getVersion = asyncHandler(async (req, res) => {
    const { version } = req.params;
    const aboutUs = await AboutUsService.getVersion(parseInt(version));
    res.json(aboutUs);
  });

  // Soft delete version
  toggleSoftDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const aboutUs = await AboutUsService.toggleSoftDelete(parseInt(id));
    res.status(200).json({
      status: "success",
      message: aboutUs.is_deleted
        ? "Soft delete version successfully"
        : "Restore version successfully",
      data: aboutUs,
    });
  });

  // Hard delete version
  hardDeleteVersion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await AboutUsService.hardDelete(parseInt(id));
    res.status(204).json({
      status: "success",
      message: "Hard delete version successfully",
    });
  });

  // Compare two versions
  compareVersions = asyncHandler(async (req, res) => {
    const { version1, version2 } = req.query;

    if (!version1 || !version2) {
      throw new ApiError(400, "Please provide both versions to compare");
    }

    const comparison = await AboutUsService.compareVersions(
      parseInt(version1),
      parseInt(version2)
    );
    res.json(comparison);
  });
}

module.exports = new AboutUsController();
