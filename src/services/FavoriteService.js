const Favorite = require("../models/Favorite");
const Hospital = require("../models/Hospital");
const ApiError = require("../exceptions/ApiError");

class FavoriteService {
  // Toggle favorite một bệnh viện
  async toggleFavorite(userId, hospitalId) {
    try {
      // Kiểm tra bệnh viện tồn tại
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        throw new ApiError(404, "Không tìm thấy bệnh viện");
      }

      // Thực hiện toggle favorite
      const isFavorited = await Favorite.toggleFavorite(userId, hospitalId);

      return {
        success: true,
        message: isFavorited
          ? "Đã thêm vào danh sách yêu thích"
          : "Đã xóa khỏi danh sách yêu thích",
        isFavorited,
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách bệnh viện yêu thích của user
  async getUserFavorites(userId, page = 1, limit = 10) {
    try {
      const result = await Favorite.getUserFavorites(userId, { page, limit });

      return {
        ...result,
        pagination: {
          ...result.pagination,
          page: Number(page),
          limit: Number(limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách user đã favorite một bệnh viện
  async getHospitalFavorites(hospitalId, page = 1, limit = 10) {
    try {
      // Kiểm tra bệnh viện tồn tại
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        throw new ApiError(404, "Không tìm thấy bệnh viện");
      }

      const result = await Favorite.getHospitalFavorites(hospitalId, {
        page,
        limit,
      });

      return {
        ...result,
        pagination: {
          ...result.pagination,
          page: Number(page),
          limit: Number(limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Kiểm tra user đã favorite bệnh viện chưa
  async checkUserFavorite(userId, hospitalId) {
    try {
      const isFavorited = await Favorite.hasUserFavorited(userId, hospitalId);
      return {
        isFavorited,
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy số lượng favorite của một bệnh viện
  async getHospitalFavoriteCount(hospitalId) {
    try {
      const count = await Favorite.countHospitalFavorites(hospitalId);
      return {
        count,
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy số lượng favorite của một user
  async getUserFavoriteCount(userId) {
    try {
      const count = await Favorite.countUserFavorites(userId);
      return {
        count,
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách favorite mới nhất
  async getLatestFavorites(limit = 10) {
    try {
      const favorites = await Favorite.getLatestFavorites(limit);
      return {
        favorites,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new FavoriteService();
