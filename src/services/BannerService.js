const Banner = require("../models/Banner");
const ApiError = require("../exceptions/ApiError");
const fs = require("fs");
const path = require("path");

class BannerService {
  // Validate dữ liệu banner
  async validateBannerData(data, file = null, isUpdate = false) {
    const errors = [];

    // Validate description nếu có
    if (data.description && data.description.trim().length < 10) {
      errors.push("Mô tả phải có ít nhất 10 ký tự");
    }

    // Validate ảnh khi tạo mới
    if (!isUpdate && !file) {
      errors.push("Ảnh banner là bắt buộc");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Dữ liệu không hợp lệ", errors);
    }
  }

  // Lấy danh sách banner có phân trang
  async getBanners(page = 1, limit = 10, includeDeleted = false) {
    try {
      return await Banner.findAll(page, limit, includeDeleted);
    } catch (error) {
      console.error("Get banners error:", error);
      throw new ApiError(500, "Lỗi khi lấy danh sách banner");
    }
  }

  // Lấy danh sách banner đang active
  async getActiveBanners() {
    try {
      return await Banner.findActive();
    } catch (error) {
      console.error("Get active banners error:", error);
      throw new ApiError(500, "Lỗi khi lấy danh sách banner active");
    }
  }

  // Tạo banner mới
  async createBanner(data, userId, file) {
    try {
      // Validate dữ liệu
      await this.validateBannerData(data, file);

      // Chuẩn bị dữ liệu banner
      const bannerData = {
        description: data.description,
        image_url: file.filename,
        created_by: userId,
        is_active: true,
      };

      // Tạo banner mới
      const banner = await Banner.create(bannerData);
      return banner;
    } catch (error) {
      // Xóa file nếu có lỗi
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  // Cập nhật banner
  async updateBanner(id, data, file = null) {
    try {
      // Kiểm tra banner tồn tại
      const banner = await Banner.findById(id);
      if (!banner) {
        throw new ApiError(404, "Không tìm thấy banner");
      }

      // Validate dữ liệu
      await this.validateBannerData(data, file, true);

      // Xóa ảnh cũ nếu có ảnh mới
      if (file && banner.image_url) {
        const oldImagePath = path.join(
          process.cwd(),
          "uploads",
          "banners",
          banner.image_url
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Chuẩn bị dữ liệu cập nhật
      const updateData = {
        description: data.description || banner.description,
        image_url: file ? file.filename : banner.image_url,
      };

      // Cập nhật banner
      const updatedBanner = await Banner.update(id, updateData);
      return updatedBanner;
    } catch (error) {
      // Xóa file mới nếu có lỗi
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  // Toggle trạng thái active
  async toggleActive(id) {
    try {
      return await Banner.toggleActive(id);
    } catch (error) {
      console.error("Toggle banner active error:", error);
      throw new ApiError(500, "Lỗi khi thay đổi trạng thái banner");
    }
  }

  // Xóa mềm banner
  async softDelete(id) {
    try {
      return await Banner.toggleSoftDelete(id);
    } catch (error) {
      console.error("Soft delete banner error:", error);
      throw new ApiError(500, "Lỗi khi xóa banner");
    }
  }

  // Xóa vĩnh viễn banner
  async hardDelete(id) {
    try {
      // Lấy thông tin banner trước khi xóa
      const banner = await Banner.findById(id);
      if (!banner) {
        throw new ApiError(404, "Không tìm thấy banner");
      }

      // Xóa file ảnh
      if (banner.image_url) {
        const imagePath = path.join(
          process.cwd(),
          "uploads",
          "banners",
          banner.image_url
        );
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      // Xóa banner trong database
      await Banner.hardDelete(id);

      return { message: "Đã xóa banner thành công" };
    } catch (error) {
      console.error("Hard delete banner error:", error);
      throw new ApiError(500, "Lỗi khi xóa vĩnh viễn banner");
    }
  }

  // Lấy chi tiết banner
  async getBannerById(id) {
    try {
      const banner = await Banner.findById(id);
      if (!banner) {
        throw new ApiError(404, "Không tìm thấy banner");
      }
      return banner;
    } catch (error) {
      console.error("Get banner by id error:", error);
      throw error;
    }
  }
}

module.exports = new BannerService();
