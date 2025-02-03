const ReviewService = require("../services/ReviewService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const HospitalService = require("../services/HospitalService");
const cache = require("../config/redis");

class ReviewController {
  // Method to clear cache
  clearReviewCache = async (hospitalId = null, reviewId = null) => {
    try {
      const keys = [
        "cache:/api/reviews", // List of reviews
      ];

      if (hospitalId) {
        keys.push(
          `cache:/api/reviews/hospital/${hospitalId}`, // Reviews of hospital
          `cache:/api/reviews/hospital/${hospitalId}/stats` // Stats of hospital
        );
      }

      if (reviewId) {
        keys.push(`cache:/api/reviews/${reviewId}`); // Details of review
      }

      // Clear cache
      for (const key of keys) {
        await cache.del(key);
      }

      // console.log(
      //   "Cleared review cache",
      //   hospitalId ? `for hospital ${hospitalId}` : "",
      //   reviewId ? `and review ${reviewId}` : ""
      // );
    } catch (error) {
      console.error("Error clearing review cache:", error);
    }
  };

  // Method to clear user review cache
  clearUserReviewCache = async (userId) => {
    try {
      if (!userId) {
        console.error('Cannot clear cache: userId is undefined');
        return;
      }
      await cache.del(`cache:/api/reviews/user/${userId}`);
      console.log("Cleared user review cache for user:", userId);
    } catch (error) {
      console.error("Error clearing user review cache:", error);
    }
  };

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

    // Clear cache after creating new review
    await this.clearReviewCache(req.body.hospital_id);
    await this.clearUserReviewCache(req.user.id);

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

    // Clear cache after reporting
    await this.clearReviewCache(review.hospital_id, req.params.id);

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
  toggleSoftDelete = asyncHandler(async (req, res) => {
    // console.log('=== Toggle Delete Controller ===');
    // console.log('User from token:', {
    //   id: req.user.id,
    //   role: req.user.role,
    //   email: req.user.email,
    //   fullName: req.user.full_name
    // });

    try {
      const result = await ReviewService.toggleSoftDelete(
        req.params.id,
        req.user.id,
        req.user.role
      );

      // Clear cache after toggling delete status
      if (result && result.hospital_id) {
        await this.clearReviewCache(result.hospital_id, req.params.id);
      }
      
      if (req.user && req.user.id) {
        await this.clearUserReviewCache(req.user.id);
      }

      res.json({
        status: "success",
        message: result.is_deleted ? "Review deleted" : "Review restored",
        data: result
      });
    } catch (error) {
      console.error('Controller error:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  });

  // Update review
  updateReview = asyncHandler(async (req, res) => {
    const review = await ReviewService.updateReview(
      req.params.id,
      req.body,
      req.user.id,
      req.file
    );

    // Clear cache after updating
    await this.clearReviewCache(review.hospital_id, req.params.id);
    await this.clearUserReviewCache(req.user.id);

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
    const review = await ReviewService.hardDelete(req.params.id);

    // Clear cache after hard delete
    await this.clearReviewCache(review.hospital_id, req.params.id);
    await this.clearUserReviewCache(review.user_id);

    res.status(200).json({
      status: "success",
      message: "Review has been permanently deleted",
    });
  });

  replyToReview = asyncHandler(async (req, res) => {
    // Check role HOSPITAL_ADMIN or ADMIN
    if (!["HOSPITAL_ADMIN", "ADMIN"].includes(req.user.role)) {
      throw new ApiError(403, "You are not authorized to reply to this review");
    }

    const { id } = req.params;
    const { reply } = req.body;
    
    const review = await ReviewService.replyToReview(
      id,
      req.user.id,
      reply
    );

    // Clear cache
    await this.clearReviewCache(review.hospital_id, id);

    res.json({
      status: "success",
      message: "Reply to review successful",
      data: review
    });
  });
}

module.exports = new ReviewController();
