const BannerService = require("../services/BannerService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");

class BannerController {
  // Get list of banners with pagination
  getBanners = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      includeDeleted = true, // Default true for admin route
    } = req.query;

    // Log for debugging
    // console.log("Get banners params:", {
    //   page,
    //   limit,
    //   includeDeleted,
    //   role: req.user?.role,
    // });

    const result = await BannerService.getBanners(
      parseInt(page),
      parseInt(limit),
      includeDeleted === "true" || includeDeleted === true // Ensure correct data type
    );
    res.json(result);
  });

  // Get list of active banners
  getActiveBanners = asyncHandler(async (req, res) => {
    const banners = await BannerService.getActiveBanners();
    res.json(banners);
  });

  // Get banner details
  getBannerById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const banner = await BannerService.getBannerById(parseInt(id));
    res.json(banner);
  });

  // Create new banner
  createBanner = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "Please upload banner image");
    }
    // Check number of files
    if (req.files && req.files.length > 1) {
      throw new ApiError(400, "Only one image is allowed for banner");
    }

    const banner = await BannerService.createBanner(
      req.body,
      req.user.id,
      req.file
    );

    res.status(201).json({
      status: "success",
      message: "Create banner successful",
      data: banner,
    });
  });

  // Update banner
  updateBanner = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Log for debugging
    // console.log('Update banner request:', {
    //   id,
    //   body: req.body,
    //   file: req.file
    // });

    const banner = await BannerService.updateBanner(
      parseInt(id),
      req.body,
      req.file || null
    );

    res.json({
      status: "success",
      message: "Update banner successful",
      data: banner,
    });
  });

  // Toggle active status
  toggleActive = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const banner = await BannerService.toggleActive(parseInt(id));

    res.json({
      status: "success",
      message: `Banner has been ${
        banner.is_active ? "activated" : "deactivated"
      }`,
      data: banner,
    });
  });

  // Soft delete banner
  softDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const banner = await BannerService.softDelete(parseInt(id));

    res.json({
      status: "success",
      message: `Banner has been ${banner.is_deleted ? "deleted" : "restored"}`,
      data: banner,
    });
  });

  // Hard delete banner
  hardDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await BannerService.hardDelete(parseInt(id));

    res.json({
      status: "success",
      message: "Banner has been permanently deleted",
    });
  });
}

module.exports = new BannerController();
