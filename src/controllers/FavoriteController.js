const FavoriteService = require("../services/FavoriteService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");

class FavoriteController {
  // Toggle favorite một bệnh viện
  toggleFavorite = asyncHandler(async (req, res) => {
    const { hospitalId } = req.params;
    const userId = req.user.id;

    const result = await FavoriteService.toggleFavorite(userId, hospitalId);

    res.json({
      status: "success",
      message: result.message,
      data: {
        isFavorited: result.isFavorited,
      },
    });
  });

  // Lấy danh sách bệnh viện yêu thích của user
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

  // Lấy danh sách user đã favorite một bệnh viện
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

  // Kiểm tra user đã favorite bệnh viện chưa
  checkUserFavorite = asyncHandler(async (req, res) => {
    const { hospitalId } = req.params;
    const userId = req.user.id;

    const result = await FavoriteService.checkUserFavorite(userId, hospitalId);

    res.json({
      status: "success",
      data: result,
    });
  });

  // Lấy số lượng favorite của một bệnh viện
  getHospitalFavoriteCount = asyncHandler(async (req, res) => {
    const { hospitalId } = req.params;

    const result = await FavoriteService.getHospitalFavoriteCount(hospitalId);

    res.json({
      status: "success",
      data: result,
    });
  });

  // Lấy số lượng favorite của một user
  getUserFavoriteCount = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const result = await FavoriteService.getUserFavoriteCount(userId);

    res.json({
      status: "success",
      data: result,
    });
  });

  // Lấy danh sách favorite mới nhất
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
