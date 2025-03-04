const FavoriteService = require("../services/FavoriteService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const cache = require("../config/redis");
const { promisify } = require('util');

class FavoriteController {
  // Method to clear cache
  clearFavoriteCache = async (userId = null, hospitalId = null) => {
    try {
      // Get all keys matching the pattern
      const favoritePattern = "cache:/api/favorites*";
      
      // Get all keys for the pattern
      const favoriteKeys = await cache.keys(favoritePattern);

      // Delete all found keys
      if (favoriteKeys.length > 0) {
        await Promise.all(favoriteKeys.map(key => cache.del(key)));
      }

      // Clear user specific cache if provided
      if (userId) {
        await Promise.all([
          cache.del(`cache:/api/favorites/user/${userId}/hospitals`),
          cache.del(`cache:/api/favorites/user/${userId}/count`),
          cache.del(`cache:/api/favorites/user/${userId}/hospitals?*`),
          cache.del(`cache:/api/favorites/check/*`)
        ]);
      }

      // Clear hospital specific cache if provided
      if (hospitalId) {
        await Promise.all([
          cache.del(`cache:/api/favorites/hospital/${hospitalId}/users`),
          cache.del(`cache:/api/favorites/hospital/${hospitalId}/count`),
          cache.del(`cache:/api/favorites/hospital/${hospitalId}/users?*`),
          cache.del(`cache:/api/favorites/check/${hospitalId}`)
        ]);
      }

      // Clear latest favorites cache if there is any change
      if (userId || hospitalId) {
        await Promise.all([
          cache.del('cache:/api/favorites/latest'),
          cache.del('cache:/api/favorites/latest?*')
        ]);
      }

    } catch (error) {
      console.error("Error clearing favorites cache:", error);
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
    const { userId } = req.params;
    
    // check access
    if (String(userId) !== String(req.user.id) && req.user.role !== 'ADMIN') {
      throw new ApiError(403, "You can't have permission to view the list of favorites of other users");
    }
  
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
    const { userId } = req.params;
    
    // check access
    if (String(userId) !== String(req.user.id) && req.user.role !== 'ADMIN') {
      throw new ApiError(403, "You can't have permission to view the number of favorites of other users");
    }
    
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
