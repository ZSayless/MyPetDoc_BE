const Banner = require("../models/Banner");
const ApiError = require("../exceptions/ApiError");
const cloudinary = require("../config/cloudinary");

class BannerService {
  // Validate banner data
  async validateBannerData(data, file = null, isUpdate = false) {
    const errors = [];

    // Validate description if exists
    if (data.description && data.description.trim().length < 10) {
      errors.push("Description must be at least 10 characters");
    }

    // Validate image when creating new
    if (!isUpdate && !file) {
      errors.push("Banner image is required");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Invalid data", errors);
    }
  }

  // Get paginated list of banners
  async getBanners(page = 1, limit = 10, includeDeleted = true) {
    try {
      // Log for debugging
      // console.log("Service getBanners params:", {
      //   page,
      //   limit,
      //   includeDeleted,
      // });

      return await Banner.findAll(page, limit, includeDeleted);
    } catch (error) {
      console.error("Get banners error:", error);
      throw new ApiError(500, "Error fetching banners");
    }
  }

  // Get list of active banners
  async getActiveBanners() {
    try {
      return await Banner.findActive();
    } catch (error) {
      console.error("Get active banners error:", error);
      throw new ApiError(500, "Error fetching active banners");
    }
  }

  // Create new banner
  async createBanner(data, userId, file) {
    try {
      // Validate data
      await this.validateBannerData(data, file);

      // Prepare banner data
      const bannerData = {
        description: data.description,
        image_url: file.path,
        created_by: userId,
        is_active: true,
      };

      // Create new banner
      const banner = await Banner.create(bannerData);
      return banner;
    } catch (error) {
      // If there is an error, delete image on Cloudinary if uploaded
      if (file && file.path) {
        const publicId = file.filename;
        await cloudinary.uploader.destroy(publicId);
      }
      throw error;
    }
  }

  // Update banner
  async updateBanner(id, data, file = null) {
    try {
      const banner = await Banner.findById(id);
      if (!banner) {
        throw new ApiError(404, "Banner not found");
      }

      await this.validateBannerData(data, file, true);

      // Delete old image on Cloudinary if new image is uploaded
      if (file && banner.image_url) {
        // Extract public_id from Cloudinary URL
        const urlParts = banner.image_url.split("/");
        const publicId = `banners/${
          urlParts[urlParts.length - 1].split(".")[0]
        }`; // Add prefix 'banners/'

        try {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Deleted old image: ${publicId}`);
        } catch (deleteError) {
          console.error("Error deleting old image:", deleteError);
          // Continue processing even if deleting old image fails
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
      // If there is an error and new image is uploaded, delete new image
      if (file && file.path) {
        const urlParts = file.path.split("/");
        const publicId = `banners/${
          urlParts[urlParts.length - 1].split(".")[0]
        }`;
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting new image:", deleteError);
        }
      }
      throw error;
    }
  }

  // Toggle active status
  async toggleActive(id) {
    try {
      return await Banner.toggleActive(id);
    } catch (error) {
      console.error("Toggle banner active error:", error);
      throw new ApiError(500, "Error toggling banner active");
    }
  }

  // Soft delete banner
  async softDelete(id) {
    try {
      return await Banner.toggleSoftDelete(id);
    } catch (error) {
      console.error("Soft delete banner error:", error);
      throw new ApiError(500, "Error soft deleting banner");
    }
  }

  // Hard delete banner
  async hardDelete(id) {
    try {
      const banner = await Banner.findById(id);
      if (!banner) {
        throw new ApiError(404, "Banner not found");
      }

      // Delete image on Cloudinary
      if (banner.image_url) {
        // Extract public_id from Cloudinary URL
        const urlParts = banner.image_url.split("/");
        const publicId = `banners/${
          urlParts[urlParts.length - 1].split(".")[0]
        }`; // Add prefix 'banners/'

        try {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Deleted banner image: ${publicId}`);
        } catch (deleteError) {
          console.error("Error deleting image on Cloudinary:", deleteError);
          // Continue processing even if deleting image fails
        }
      }

      await Banner.hardDelete(id);
      return { message: "Banner deleted successfully" };
    } catch (error) {
      console.error("Hard delete banner error:", error);
      throw new ApiError(500, "Error hard deleting banner");
    }
  }

  // Get banner details
  async getBannerById(id) {
    try {
      const banner = await Banner.findById(id);
      if (!banner) {
        throw new ApiError(404, "Banner not found");
      }
      return banner;
    } catch (error) {
      console.error("Get banner by id error:", error);
      throw error;
    }
  }
}

module.exports = new BannerService();
