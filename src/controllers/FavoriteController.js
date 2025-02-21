const FavoriteService = require("../services/FavoriteService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const cache = require("../config/redis");

class FavoriteController {
  // Method to clear cache
  clearFavoriteCache = async (userId = null, hospitalId = null) => {
    try {
      let keys = ["cache:/api/favorites/latest"];

      if (userId) {
        keys.push(
          `cache:/api/favorites/user/${userId}/hospitals`,
          `cache:/api/favorites/user/${userId}/count`,
          `cache:/api/favorites/check/${hospitalId}`
        );
      }

      if (hospitalId) {
        keys.push(
          `cache:/api/favorites/hospital/${hospitalId}/users`,
          `cache:/api/favorites/hospital/${hospitalId}/count`
        );
      }

      // Clear cache
      for (const key of keys) {
        await cache.del(key);
      }
    } catch (error) {
      console.error("Error clearing favorite cache:", error);
    }
  };

  // Toggle favorite
  toggleFavorite = asyncHandler(async (req, res) => {
    const { hospitalId } = req.params;
    const userId = req.user.id;

    const result = await FavoriteService.toggleFavorite(userId, hospitalId);

    await this.clearFavoriteCache(userId, hospitalId);

    res.json({
      status: "success",
      message: result.message,
      data: {
        isFavorited: result.isFavorited,
      },
    });
  });

  // Get user favorites
  getUserFavorites = asyncHandler(async (req, res) => {
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
  });

  // Get hospital favorites
  getHospitalFavorites = asyncHandler(async (req, res) => {
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
  });

  // Check user favorite
  checkUserFavorite = asyncHandler(async (req, res) => {
    const { hospitalId } = req.params;
    const userId = req.user.id;

    const result = await FavoriteService.checkUserFavorite(userId, hospitalId);

    res.json({
      status: "success",
      data: result,
    });
  });

  // Get counts
  getHospitalFavoriteCount = asyncHandler(async (req, res) => {
    const { hospitalId } = req.params;
    const result = await FavoriteService.getHospitalFavoriteCount(hospitalId);

    res.json({
      status: "success",
      data: result,
    });
  });

  getUserFavoriteCount = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await FavoriteService.getUserFavoriteCount(userId);

    res.json({
      status: "success",
      data: result,
    });
  });

  // Get latest favorites
  getLatestFavorites = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const result = await FavoriteService.getLatestFavorites(parseInt(limit));

    res.json({
      status: "success",
      data: result,
    });
  });
}

module.exports = new FavoriteController();
