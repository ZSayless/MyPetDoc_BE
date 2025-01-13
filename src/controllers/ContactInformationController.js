const ContactInformationService = require("../services/ContactInformationService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");

class ContactInformationController {
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
    // Check admin permission
    if (req.user.role !== "ADMIN") {
      throw new ApiError(403, "You are not allowed to perform this action");
    }
    const { id } = req.params;

    const contact = await ContactInformationService.toggleSoftDelete(
      parseInt(id)
    );
    res.json(contact);
  });

  // Hard delete
  hardDelete = asyncHandler(async (req, res) => {
    // Check admin permission
    if (req.user.role !== "ADMIN") {
      throw new ApiError(403, "You are not allowed to perform this action");
    }

    await ContactInformationService.hardDelete(req.params.id);
    res.status(200).json({
      status: "success",
      message: "Permanently delete version successful",
    });
  });
}

module.exports = new ContactInformationController();
