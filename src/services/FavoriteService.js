const Favorite = require("../models/Favorite");
const Hospital = require("../models/Hospital");
const ApiError = require("../exceptions/ApiError");

class FavoriteService {
  // Toggle favorite a hospital
  async toggleFavorite(userId, hospitalId) {
    try {
      // Check if hospital exists
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        throw new ApiError(404, "Hospital not found");
      }

      // Perform toggle favorite
      const isFavorited = await Favorite.toggleFavorite(userId, hospitalId);

      return {
        success: true,
        message: isFavorited
          ? "Added to favorites list"
          : "Removed from favorites list",
        isFavorited,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get list of favorite hospitals of a user
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

  // Get list of users who have favorited a hospital
  async getHospitalFavorites(hospitalId, page = 1, limit = 10) {
    try {
      // Check if hospital exists
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        throw new ApiError(404, "Hospital not found");
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

  // Check if user has favorited a hospital
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

  // Get number of favorites of a hospital
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

  // Get number of favorites of a user
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

  // Get list of latest favorites
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
