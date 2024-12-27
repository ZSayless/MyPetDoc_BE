const BannerService = require("../services/BannerService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");

class BannerController {
  // Lấy danh sách banner có phân trang
  getBanners = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, includeDeleted = false } = req.query;
    const result = await BannerService.getBanners(
      parseInt(page),
      parseInt(limit),
      includeDeleted === "true"
    );
    res.json(result);
  });

  // Lấy danh sách banner đang active
  getActiveBanners = asyncHandler(async (req, res) => {
    const banners = await BannerService.getActiveBanners();
    res.json(banners);
  });

  // Lấy chi tiết banner
  getBannerById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const banner = await BannerService.getBannerById(parseInt(id));
    res.json(banner);
  });

  // Tạo banner mới
  createBanner = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "Vui lòng upload ảnh banner");
    }
    // Kiểm tra số lượng file
    if (req.files && req.files.length > 1) {
      throw new ApiError(400, "Chỉ được phép upload 1 ảnh cho banner");
    }

    const banner = await BannerService.createBanner(
      req.body,
      req.user.id,
      req.file
    );

    res.status(201).json({
      status: "success",
      message: "Tạo banner thành công",
      data: banner,
    });
  });

  // Cập nhật banner
  updateBanner = asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const banner = await BannerService.updateBanner(
        parseInt(id),
        req.body,
        req.file || null
      );

      res.json({
        status: "success",
        message: "Cập nhật banner thành công",
        data: banner,
      });
    } catch (error) {
      throw new ApiError(500, "Lỗi khi cập nhật banner");
    }
  });

  // Toggle trạng thái active
  toggleActive = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const banner = await BannerService.toggleActive(parseInt(id));

    res.json({
      status: "success",
      message: `Banner đã được ${
        banner.is_active ? "kích hoạt" : "vô hiệu hóa"
      }`,
      data: banner,
    });
  });

  // Xóa mềm banner
  softDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const banner = await BannerService.softDelete(parseInt(id));

    res.json({
      status: "success",
      message: `Banner đã được ${banner.is_deleted ? "xóa" : "khôi phục"}`,
      data: banner,
    });
  });

  // Xóa vĩnh viễn banner
  hardDelete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await BannerService.hardDelete(parseInt(id));

    res.json({
      status: "success",
      message: "Đã xóa vĩnh viễn banner",
    });
  });
}

module.exports = new BannerController();
