const FavoriteService = require("../services/FavoriteService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const cache = require("../config/redis");
const { promisify } = require('util');

class FavoriteController {
  // Method to clear cache
  clearFavoriteCache = async (userId = null, hospitalId = null) => {
    try {
      // List of patterns to delete
      const patterns = [];
      
      // If there is no userId and hospitalId, delete all favorites cache
      if (!userId && !hospitalId) {
        patterns.push("cache:/api/favorites*");
      }
      
      // Add specific pattern for user if provided
      if (userId) {
        patterns.push(`cache:/api/favorites/user/${userId}*`);
        patterns.push(`cache:/api/favorites/check/*`);
      }
      
      // Add specific pattern for hospital if provided
      if (hospitalId) {
        patterns.push(`cache:/api/favorites/hospital/${hospitalId}*`);
        patterns.push(`cache:/api/favorites/check/${hospitalId}*`);
      }
      
      // Get and delete all keys matching the patterns
      for (const pattern of patterns) {
        const keys = await cache.keys(pattern);
        if (keys.length > 0) {
          console.log(`Xóa ${keys.length} cache key khớp với pattern: ${pattern}`);
          await Promise.all(keys.map(key => cache.del(key)));
        }
      }
      
      // Delete specific keys
      const specificKeys = [];
      
      if (userId) {
        specificKeys.push(`cache:/api/favorites/user/${userId}/hospitals?page=1&limit=10`);
        specificKeys.push(`cache:/api/favorites/user/${userId}/count`);
      }
      
      if (hospitalId) {
        specificKeys.push(`cache:/api/favorites/hospital/${hospitalId}/users?page=1&limit=10`);
        specificKeys.push(`cache:/api/favorites/hospital/${hospitalId}/count`);
        specificKeys.push(`cache:/api/favorites/check/${hospitalId}`);
      }
      
      // Delete cache latest favorites if there is a change
      if (userId || hospitalId) {
        specificKeys.push(`cache:/api/favorites/latest`);
        specificKeys.push(`cache:/api/favorites/latest?limit=10`);
      }
      
      for (const key of specificKeys) {
        const exists = await cache.exists(key);
        if (exists) {
          console.log(`Delete cache key: ${key}`);
          await cache.del(key);
        }
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
