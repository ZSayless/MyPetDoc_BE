const Banner = require("../models/Banner");
const ApiError = require("../exceptions/ApiError");
const cloudinary = require("../config/cloudinary");

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
        image_url: file.path,
        created_by: userId,
        is_active: true,
      };

      // Tạo banner mới
      const banner = await Banner.create(bannerData);
      return banner;
    } catch (error) {
      // Nếu có lỗi, xóa ảnh trên Cloudinary nếu đã upload
      if (file && file.path) {
        const publicId = file.filename;
        await cloudinary.uploader.destroy(publicId);
      }
      throw error;
    }
  }

  // Cập nhật banner
  async updateBanner(id, data, file = null) {
    try {
      const banner = await Banner.findById(id);
      if (!banner) {
        throw new ApiError(404, "Không tìm thấy banner");
      }

      await this.validateBannerData(data, file, true);

      // Xóa ảnh cũ trên Cloudinary nếu có ảnh mới
      if (file && banner.image_url) {
        // Trích xuất public_id từ URL Cloudinary
        const urlParts = banner.image_url.split("/");
        const publicId = `banners/${
          urlParts[urlParts.length - 1].split(".")[0]
        }`; // Thêm prefix 'banners/'

        try {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Đã xóa ảnh cũ: ${publicId}`);
        } catch (deleteError) {
          console.error("Lỗi khi xóa ảnh cũ:", deleteError);
          // Có thể tiếp tục xử lý mặc dù xóa ảnh cũ thất bại
        }
      }

      const updateData = {
        description:
          data.description !== undefined
            ? data.description
            : banner.description,
      };

      if (file) {
        updateData.image_url = file.path;
      }

      const updatedBanner = await Banner.update(id, updateData);
      return updatedBanner;
    } catch (error) {
      // Nếu có lỗi và đã upload ảnh mới, xóa ảnh mới
      if (file && file.path) {
        const urlParts = file.path.split("/");
        const publicId = `banners/${
          urlParts[urlParts.length - 1].split(".")[0]
        }`;
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Lỗi khi xóa ảnh mới:", deleteError);
        }
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
      const banner = await Banner.findById(id);
      if (!banner) {
        throw new ApiError(404, "Không tìm thấy banner");
      }

      // Xóa ảnh trên Cloudinary
      if (banner.image_url) {
        // Trích xuất public_id từ URL Cloudinary
        const urlParts = banner.image_url.split("/");
        const publicId = `banners/${
          urlParts[urlParts.length - 1].split(".")[0]
        }`; // Thêm prefix 'banners/'

        try {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Đã xóa ảnh banner: ${publicId}`);
        } catch (deleteError) {
          console.error("Lỗi khi xóa ảnh trên Cloudinary:", deleteError);
          // Có thể tiếp tục xử lý mặc dù xóa ảnh thất bại
        }
      }

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
