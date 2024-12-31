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

      // Kiểm tra bệnh viện có bị xóa hoặc không active
      if (hospital.is_deleted || !hospital.is_active) {
        throw new ApiError(400, "Bệnh viện này không khả dụng");
      }

      // Toggle favorite và lấy trạng thái mới
      const hasFavorited = await Favorite.toggleFavorite(userId, hospitalId);

      return {
        success: true,
        message: hasFavorited
          ? "Đã thêm vào danh sách yêu thích"
          : "Đã xóa khỏi danh sách yêu thích",
        data: {
          hasFavorited,
        },
      };
    } catch (error) {
      console.error("Toggle favorite error:", error);
      throw error;
    }
  }

  // Lấy danh sách bệnh viện yêu thích của user
  async getUserFavorites(userId, options = {}) {
    try {
      const result = await Favorite.getUserFavorites(userId, options);

      // Thêm trường hasFavorited = true cho tất cả kết quả
      const favoritesWithStatus = result.favorites.map((hospital) => ({
        ...hospital,
        hasFavorited: true,
      }));

      return {
        success: true,
        message: "Lấy danh sách yêu thích thành công",
        data: {
          favorites: favoritesWithStatus,
          pagination: result.pagination,
        },
      };
    } catch (error) {
      console.error("Get user favorites error:", error);
      throw error;
    }
  }

  // Lấy danh sách user đã favorite một bệnh viện
  async getHospitalFavorites(hospitalId, options = {}) {
    try {
      // Kiểm tra bệnh viện tồn tại
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        throw new ApiError(404, "Không tìm thấy bệnh viện");
      }

      const result = await Favorite.getHospitalFavorites(hospitalId, options);

      return {
        success: true,
        message: "Lấy danh sách người dùng yêu thích thành công",
        data: {
          users: result.users,
          pagination: result.pagination,
        },
      };
    } catch (error) {
      console.error("Get hospital favorites error:", error);
      throw error;
    }
  }

  // Kiểm tra user đã favorite bệnh viện chưa
  async checkUserFavorite(userId, hospitalId) {
    try {
      const hasFavorited = await Favorite.hasUserFavorited(userId, hospitalId);

      return {
        success: true,
        data: {
          hasFavorited,
        },
      };
    } catch (error) {
      console.error("Check user favorite error:", error);
      throw error;
    }
  }

  // Lấy số lượng favorite của bệnh viện
  async getHospitalFavoriteCount(hospitalId) {
    try {
      // Kiểm tra bệnh viện tồn tại
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        throw new ApiError(404, "Không tìm thấy bệnh viện");
      }

      const count = await Favorite.countHospitalFavorites(hospitalId);

      return {
        success: true,
        data: {
          count,
        },
      };
    } catch (error) {
      console.error("Get hospital favorite count error:", error);
      throw error;
    }
  }

  // Xóa tất cả favorite của một user (dùng khi xóa tài khoản)
  async removeAllUserFavorites(userId) {
    try {
      await Favorite.query(
        `UPDATE ${Favorite.tableName} 
         SET is_deleted = 1 
         WHERE user_id = ?`,
        [userId]
      );

      return {
        success: true,
        message: "Đã xóa tất cả favorite của user",
      };
    } catch (error) {
      console.error("Remove all user favorites error:", error);
      throw error;
    }
  }

  // Xóa tất cả favorite của một bệnh viện (dùng khi xóa bệnh viện)
  async removeAllHospitalFavorites(hospitalId) {
    try {
      await Favorite.query(
        `UPDATE ${Favorite.tableName} 
         SET is_deleted = 1 
         WHERE hospital_id = ?`,
        [hospitalId]
      );

      return {
        success: true,
        message: "Đã xóa tất cả favorite của bệnh viện",
      };
    } catch (error) {
      console.error("Remove all hospital favorites error:", error);
      throw error;
    }
  }
}

module.exports = new FavoriteService();
