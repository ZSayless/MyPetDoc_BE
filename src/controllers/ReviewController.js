const ReviewService = require("../services/ReviewService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const HospitalService = require("../services/HospitalService");

class ReviewController {
  // Create new review
  createReview = asyncHandler(async (req, res) => {
    const file = req.file;
    // Check if hospital exists
    const hospital = await HospitalService.getHospitalById(
      req.body.hospital_id
    );
    if (!hospital) {
      throw new ApiError(404, "Hospital not found");
    }

    const review = await ReviewService.createReview(
      req.body,
      req.user.id,
      file
    );
    res.status(201).json({
      status: "success",
      message: "Create review successful",
      data: review,
    });
  });

  // Get list of reviews
  getReviews = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, ...filters } = req.query;
    const reviews = await ReviewService.getReviews(filters, page, limit);
    res.json({
      status: "success",
      data: reviews,
    });
  });

  // Get review details
  getReviewById = asyncHandler(async (req, res) => {
    const review = await ReviewService.getReviewById(req.params.id);
    res.json({
      status: "success",
      data: review,
    });
  });

  // Report review
  reportReview = asyncHandler(async (req, res) => {
    const review = await ReviewService.reportReview(
      req.params.id,
      req.body,
      req.user.id
    );
    res.json({
      status: "success",
      message: "Report review successful",
      data: review,
    });
  });

  // Get hospital review stats
  getHospitalStats = asyncHandler(async (req, res) => {
    const stats = await ReviewService.getHospitalStats(req.params.hospitalId);
    res.json({
      status: "success",
      data: stats,
    });
  });

  // Toggle soft delete status of review
  async toggleSoftDelete(req, res, next) {
    try {
      const { id } = req.params;
      const review = await ReviewService.toggleSoftDelete(
        id,
        req.user.id,
        req.user.role
      );

      res.json({
        status: "success",
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update review
  updateReview = asyncHandler(async (req, res) => {
    const review = await ReviewService.updateReview(
      req.params.id,
      req.body,
      req.user.id,
      req.file
    );
    res.json({
      status: "success",
      message: "Update review successful",
      data: review,
    });
  });

  // Check if user can review
  canUserReview = asyncHandler(async (req, res) => {
    const result = await ReviewService.canUserReview(
      req.user.id,
      req.params.hospitalId
    );
    res.json({
      status: "success",
      data: result,
    });
  });

  // Get list of reviews by hospital
  async getHospitalReviews(req, res, next) {
    try {
      const { hospitalId } = req.params;
      const { page, limit } = req.query;

      const result = await ReviewService.getHospitalReviews(hospitalId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
      });

      res.json({
        status: "success",
        data: result.reviews,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  getUserReviews = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const reviews = await ReviewService.getUserReviews(
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      status: "success",
      data: reviews,
    });
  });

  deleteReview = asyncHandler(async (req, res) => {
    const result = await ReviewService.deleteReview(
      req.params.id,
      req.user.id,
      req.user.role === "ADMIN"
    );

    res.json(result);
  });

  hardDeleteReview = asyncHandler(async (req, res) => {
    const result = await ReviewService.hardDelete(req.params.id);
    res.status(200).json(result);
  });
}

module.exports = new ReviewController();
