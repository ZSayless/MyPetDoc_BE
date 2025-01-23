const FavoriteService = require("../services/FavoriteService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const cache = require("../config/redis");

class FavoriteController {
  // Method to clear cache
  clearFavoriteCache = async (userId, hospitalId) => {
    try {
      const keys = [
        `cache:/api/favorites/user/${userId}/hospitals`,
        `cache:/api/favorites/user/${userId}/count`,
        `cache:/api/favorites/hospital/${hospitalId}/users`,
        `cache:/api/favorites/hospital/${hospitalId}/count`,
        "cache:/api/favorites/latest",
      ];

      // Clear cache related to favorite
      for (const key of keys) {
        await cache.del(key);
      }

      // console.log(
      //   "Cleared favorite cache for user:",
      //   userId,
      //   "hospital:",
      //   hospitalId
      // );
    } catch (error) {
      console.error("Error clearing favorite cache:", error);
    }
  };

  // Toggle favorite a hospital
  toggleFavorite = asyncHandler(async (req, res) => {
    try {
      const { hospitalId } = req.params;
      const userId = req.user.id;

      const result = await FavoriteService.toggleFavorite(userId, hospitalId);

      // Clear cache after toggle favorite
      await this.clearFavoriteCache(userId, hospitalId);

      res.json({
        status: "success",
        message: result.message,
        data: {
          isFavorited: result.isFavorited,
        },
      });
    } catch (error) {
      throw new ApiError(500, "Internal server error");
    }
  });

  // Get list of favorite hospitals of user
  getUserFavorites = asyncHandler(async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const userId = req.user.id;

      const result = await FavoriteService.getUserFavorites(
        userId,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      throw new ApiError(500, "Internal server error");
    }
  });

  // Get list of users who have favorite a hospital
  getHospitalFavorites = asyncHandler(async (req, res) => {
    try {
      const { hospitalId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const result = await FavoriteService.getHospitalFavorites(
        hospitalId,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      throw new ApiError(500, "Internal server error");
    }
  });

  // Check if user has favorite a hospital
  checkUserFavorite = asyncHandler(async (req, res) => {
    try {
      const { hospitalId } = req.params;
      const userId = req.user.id;

      const result = await FavoriteService.checkUserFavorite(
        userId,
        hospitalId
      );

      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      throw new ApiError(500, "Internal server error");
    }
  });

  // Get favorite count of a hospital
  getHospitalFavoriteCount = asyncHandler(async (req, res) => {
    try {
      const { hospitalId } = req.params;

      const result = await FavoriteService.getHospitalFavoriteCount(hospitalId);

      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      throw new ApiError(500, "Internal server error");
    }
  });

  // Get favorite count of a user
  getUserFavoriteCount = asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;

      const result = await FavoriteService.getUserFavoriteCount(userId);

      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      throw new ApiError(500, "Internal server error");
    }
  });

  // Get list of latest favorites
  getLatestFavorites = asyncHandler(async (req, res) => {
    try {
      const { limit = 10 } = req.query;

      const result = await FavoriteService.getLatestFavorites(parseInt(limit));

      res.json({
        status: "success",
        data: result,
      });
    } catch (error) {
      throw new ApiError(500, "Internal server error");
    }
  });
}

module.exports = new FavoriteController();
