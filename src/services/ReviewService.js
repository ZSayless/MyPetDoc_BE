const Review = require("../models/Review");
const Hospital = require("../models/Hospital");
const ApiError = require("../exceptions/ApiError");
const cloudinary = require("../config/cloudinary");
const User = require("../models/User");

class ReviewService {
  // Create new review
  async createReview(data, userId, file = null) {
    try {
      // Validate basic data
      await this.validateReviewData(data, file);

      // Check if user has reviewed
      const hasReviewed = await Review.hasUserReviewed(
        userId,
        data.hospital_id
      );
      if (hasReviewed) {
        throw new ApiError(400, "You have already reviewed this hospital");
      }

      // Prepare review data
      const reviewData = {
        user_id: userId,
        hospital_id: parseInt(data.hospital_id),
        rating: parseInt(data.rating) || 5,
        comment: data.comment || null,
        image_url: file ? file.path : null,
        image_description: data.image_description || null,
      };

      // console.log("Creating review with data:", reviewData);

      const result = await Review.create(reviewData);
      // console.log("Create result:", result);

      // Get created review
      const review = await Review.findById(result.insertId);
      if (!review) {
        throw new ApiError(500, "Cannot create review");
      }

      return review;
    } catch (error) {
      // If there is an error and an image has been uploaded, delete the image on Cloudinary
      if (file && file.path) {
        try {
          const urlParts = file.path.split("/");
          const publicId = `reviews/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting image on Cloudinary:", deleteError);
        }
      }
      throw error;
    }
  }

  // Get list of reviews with filters and pagination
  async getReviews(filters = {}, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      return await Review.search(filters, { offset, limit });
    } catch (error) {
      throw error;
    }
  }

  // Get detailed information of a review
  async getReviewById(id) {
    try {
      const review = await Review.findById(id);
      if (!review) {
        throw new ApiError(404, "Review not found");
      }
      return review;
    } catch (error) {
      throw error;
    }
  }

  // Report review
  async reportReview(reviewId, reportData, userId) {
    try {
      // Check if review exists
      const review = await this.getReviewById(reviewId);
      if (!review) {
        throw new ApiError(404, "Review not found");
      }

      // Check if user has reported this review
      const hasReported = await Review.hasUserReported(userId, reviewId);
      if (hasReported) {
        throw new ApiError(400, "You have already reported this review");
      }

      // Prepare report data
      const reportWithUser = {
        review_id: reviewId,
        reported_by: userId,
        reason: reportData.reason || "No reason",
        created_at: new Date(),
      };

      // Add report and update review status
      const result = await Review.report(reviewId, reportWithUser);

      return {
        success: true,
        message: "Reported review successfully",
        data: result,
      };
    } catch (error) {
      console.error("Report review error:", error);
      throw error;
    }
  }

  // Get review statistics of a hospital
  async getHospitalStats(hospitalId) {
    try {
      return await Review.getHospitalStats(hospitalId);
    } catch (error) {
      throw error;
    }
  }

  // Validate review data
  async validateReviewData(data, file = null, isUpdate = false) {
    const errors = [];

    // Validate hospital_id (required when creating)
    if (!isUpdate && !data.hospital_id) {
      errors.push("Hospital ID is required");
    }

    // Validate rating if exists
    if (data.rating !== undefined) {
      const rating = parseInt(data.rating);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        errors.push("Rating must be between 1-5");
      }
    }

    // When creating: must have at least comment or image
    // When updating: not required
    if (!isUpdate && !data.comment && !file) {
      errors.push("Review must have at least comment or image");
    }

    // Validate comment if exists
    if (data.comment && data.comment.trim().length < 10) {
      errors.push("Comment must be at least 10 characters");
    }

    // Validate image_description if new image exists
    if (file && !data.image_description) {
      errors.push("Please add a description for the image");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Invalid data", errors);
    }
  }

  // Check if image URL is valid
  isValidImageUrl(url) {
    // Check basic URL format
    try {
      new URL(url);
      // Check file extension
      const extensions = [".jpg", ".jpeg", ".png", ".gif"];
      return extensions.some((ext) => url.toLowerCase().endsWith(ext));
    } catch {
      return false;
    }
  }

  // Toggle soft delete review (soft delete/restore)
  async toggleSoftDelete(id, userId, userRole) {
    try {
      const review = await Review.findById(id);
      if (!review) {
        throw new ApiError(404, "Review not found");
      }

      // Check delete permission
      if (userRole !== "ADMIN" && review.user_id !== userId) {
        throw new ApiError(403, "You do not have permission to perform this action");
      }

      // Toggle delete status
      const updatedReview = await Review.toggleSoftDelete(id);

      return {
        success: true,
        message: updatedReview.is_deleted
          ? "Review deleted successfully"
          : "Review restored successfully",
        review: updatedReview,
      };
    } catch (error) {
      throw error;
    }
  }

  // Hard delete review
  async hardDelete(reviewId) {
    try {
      // Kiểm tra review tồn tại
      const review = await Review.findById(reviewId);
      if (!review) {
        throw new ApiError(404, "Review not found");
      }

      // Xóa ảnh trên Cloudinary nếu có
      if (review.image_url) {
        try {
          const publicId = review.image_url.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`reviews/${publicId}`);
        } catch (deleteError) {
          console.error("Error deleting image from Cloudinary:", deleteError);
          // Tiếp tục xóa review ngay cả khi xóa ảnh thất bại
        }
      }

      // Xóa review trong database
      await Review.hardDelete(reviewId);

      return {
        message: "Review permanently deleted",
        reviewId
      };

    } catch (error) {
      console.error("Hard delete review error:", error);
      throw error;
    }
  }

  // Update review
  async updateReview(id, data, userId, file = null) {
    try {
      // Get current review
      const existingReview = await Review.findById(id);
      if (!existingReview) {
        throw new ApiError(404, "Review not found");
      }

      // Check permission
      if (existingReview.user_id !== userId) {
        throw new ApiError(403, "You do not have permission to edit this review");
      }

      // Validate new data (with isUpdate = true)
      await this.validateReviewData(data, file, true);

      // Prepare update data - chỉ lấy các field được gửi lên
      const updateData = {};
      
      // Chỉ cập nhật rating nếu có
      if (data.rating !== undefined) {
        updateData.rating = parseInt(data.rating);
      }
      
      // Chỉ cập nhật comment nếu có
      if (data.comment !== undefined) {
        updateData.comment = data.comment;
      }

      // Chỉ cập nhật image và image_description nếu có file mới
      if (file) {
        // Xóa ảnh cũ nếu có
        if (existingReview.image_url) {
          try {
            const publicId = existingReview.image_url.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`reviews/${publicId}`);
          } catch (deleteError) {
            console.error("Error deleting old image on Cloudinary:", deleteError);
          }
        }
        updateData.image_url = file.path;
        updateData.image_description = data.image_description;
      }

      // Update review
      const updatedReview = await Review.update(id, updateData);

      return updatedReview;
    } catch (error) {
      // If there is an error and a new image has been uploaded, delete the new image
      if (file && file.path) {
        try {
          const urlParts = file.path.split("/");
          const publicId = `reviews/${urlParts[urlParts.length - 1].split(".")[0]}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting new image on Cloudinary:", deleteError);
        }
      }
      throw error;
    }
  }

  // Check if user can review
  async canUserReview(userId, hospitalId) {
    try {
      // Check if user has reviewed
      const hasReviewed = await Review.hasUserReviewed(userId, hospitalId);
      if (hasReviewed) {
        return {
          canReview: false,
          message: "You have already reviewed this hospital",
        };
      }

      return {
        canReview: true,
        message: "You can review this hospital",
      };
    } catch (error) {
      throw error;
    }
  }

  // Get list of reviews by hospital
  async getHospitalReviews(hospitalId, { page = 1, limit = 10 } = {}) {
    try {
      const offset = (page - 1) * limit;

      // Use search method with filter by hospital_id
      const result = await Review.search(
        { hospital_id: hospitalId },
        { offset, limit }
      );

      return {
        ...result,
        pagination: {
          ...result.pagination,
          page: parseInt(page),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserReviews(userId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      return await Review.search({ user_id: userId }, { offset, limit });
    } catch (error) {
      throw error;
    }
  }

  async deleteReview(id, userId, isAdmin = false) {
    try {
      // Get review information before deleting
      const review = await Review.findById(id);
      if (!review) {
        throw new ApiError(404, "Review not found");
      }

      // Check delete permission
      if (!isAdmin && review.user_id !== userId) {
        throw new ApiError(403, "You do not have permission to delete this review");
      }

      // Delete review in database
      await Review.softDelete(id);

      return {
        success: true,
        message: "Review deleted successfully",
      };
    } catch (error) {
      console.error("Delete review error:", error);
      throw error;
    }
  }

  async replyToReview(reviewId, userId, replyContent) {
    try {
      // Validate reply content
      if (!replyContent || replyContent.trim().length < 10) {
        throw new ApiError(400, "Reply content must be at least 10 characters");
      }

      // Get review information
      const review = await Review.findById(reviewId);
      if (!review) {
        throw new ApiError(404, "Review not found");
      }

      // Get user information
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Check permission
      if (user.role === 'HOSPITAL_ADMIN' && user.hospital_id !== review.hospital_id) {
        throw new ApiError(403, "You do not have permission to reply to this review");
      }

      // Add reply
      const updatedReview = await Review.reply(reviewId, userId, replyContent);

      return updatedReview;
    } catch (error) {
      console.error("Reply to review error:", error);
      throw error;
    }
  }
}

module.exports = new ReviewService();
