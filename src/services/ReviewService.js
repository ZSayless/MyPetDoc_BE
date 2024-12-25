const Review = require("../models/Review");
const Hospital = require("../models/Hospital");
const ApiError = require("../exceptions/ApiError");

class ReviewService {
  // Tạo review mới
  async createReview(data, userId) {
    try {
      // Validate dữ liệu
      await this.validateReviewData(data);

      // Kiểm tra hospital tồn tại
      const hospital = await Hospital.findById(data.hospital_id);
      if (!hospital) {
        throw new ApiError(404, "Không tìm thấy bệnh viện");
      }

      // Kiểm tra xem user đã review bệnh viện này chưa
      const hasReviewed = await Review.hasUserReviewed(
        userId,
        data.hospital_id
      );
      if (hasReviewed) {
        throw new ApiError(400, "Bạn đã đánh giá bệnh viện này rồi");
      }

      // Chuẩn bị dữ liệu
      const reviewData = {
        user_id: userId,
        hospital_id: data.hospital_id,
        rating: data.rating,
        comment: data.comment || null,
        image_url: data.image_url || null,
        image_description: data.image_description || null,
      };

      const review = await Review.create(reviewData);
      return review;
    } catch (error) {
      console.error("Create Review Error:", error);
      throw error;
    }
  }

  // Lấy danh sách review với filter và phân trang
  async getReviews(filters = {}, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      return await Review.search(filters, { offset, limit });
    } catch (error) {
      throw error;
    }
  }

  // Lấy chi tiết một review
  async getReviewById(id) {
    try {
      const review = await Review.findById(id);
      if (!review) {
        throw new ApiError(404, "Không tìm thấy đánh giá này");
      }
      return review;
    } catch (error) {
      throw error;
    }
  }

  // Báo cáo review
  async reportReview(reviewId, reportData, userId) {
    try {
      // Kiểm tra review tồn tại
      const review = await this.getReviewById(reviewId);

      // Kiểm tra xem user đã báo cáo review này chưa
      const hasReported = await Review.hasUserReported(userId, reviewId);
      if (hasReported) {
        throw new ApiError(400, "Bạn đã báo cáo đánh giá này rồi");
      }

      // Thêm thông tin người báo cáo
      const reportWithUser = {
        ...reportData,
        reported_by: userId,
      };

      return await Review.report(reviewId, reportWithUser);
    } catch (error) {
      throw error;
    }
  }

  // Lấy thống kê đánh giá của bệnh viện
  async getHospitalStats(hospitalId) {
    try {
      return await Review.getHospitalStats(hospitalId);
    } catch (error) {
      throw error;
    }
  }

  // Validate dữ liệu review
  async validateReviewData(data) {
    const errors = [];

    // Validate hospital_id
    if (!data.hospital_id) {
      errors.push("Hospital ID là bắt buộc");
    }

    // Validate rating
    if (!data.rating || data.rating < 1 || data.rating > 5) {
      errors.push("Rating phải từ 1-5");
    }

    // Validate comment hoặc ảnh
    if (!data.comment && !data.image_url) {
      errors.push("Review phải có ít nhất comment hoặc ảnh");
    }

    // Validate comment nếu có
    if (data.comment && data.comment.trim().length < 10) {
      errors.push("Comment phải có ít nhất 10 ký tự");
    }

    // Validate image_description nếu có ảnh
    if (data.image_url && !data.image_description) {
      errors.push("Vui lòng thêm mô tả cho ảnh");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Dữ liệu không hợp lệ", errors);
    }
  }

  // Kiểm tra URL ảnh hợp lệ
  isValidImageUrl(url) {
    // Kiểm tra định dạng URL cơ bản
    try {
      new URL(url);
      // Kiểm tra phần mở rộng file
      const extensions = [".jpg", ".jpeg", ".png", ".gif"];
      return extensions.some((ext) => url.toLowerCase().endsWith(ext));
    } catch {
      return false;
    }
  }

  // Toggle soft delete review (xóa mềm/khôi phục)
  async toggleSoftDelete(id, userId, userRole) {
    try {
      const review = await this.getReviewById(id);

      // Kiểm tra quyền xóa/khôi phục
      if (review.user_id !== userId && userRole !== "HOSPITAL_ADMIN") {
        throw new ApiError(403, "Bạn không có quyền thực hiện hành động này");
      }

      // Toggle trạng thái xóa
      const updatedReview = await Review.toggleSoftDelete(id);

      // Trả về message tương ứng
      return {
        success: true,
        message: updatedReview.is_deleted
          ? "Đã xóa đánh giá thành công"
          : "Đã khôi phục đánh giá thành công",
        review: updatedReview,
      };
    } catch (error) {
      throw error;
    }
  }

  // Xóa vĩnh viễn review
  async hardDelete(id, userId, userRole) {
    try {
      const review = await this.getReviewById(id);

      // Chỉ HOSPITAL_ADMIN mới có quyền xóa vĩnh viễn
      if (userRole !== "HOSPITAL_ADMIN") {
        throw new ApiError(
          403,
          "Chỉ admin mới có quyền xóa vĩnh viễn đánh giá"
        );
      }

      // Kiểm tra review đã bị xóa mềm chưa
      if (!review.is_deleted) {
        throw new ApiError(
          400,
          "Chỉ có thể xóa vĩnh viễn những đánh giá đã bị xóa mềm"
        );
      }

      // Xóa các báo cáo liên quan
      await Review.query("DELETE FROM report_reasons WHERE review_id = ?", [
        id,
      ]);

      // Xóa review
      await Review.hardDelete(id);

      return {
        success: true,
        message: "Đã xóa vĩnh viễn đánh giá thành công",
      };
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật review
  async updateReview(id, data, userId) {
    try {
      // Kiểm tra review tồn tại và thuộc về user
      const existingReview = await this.getReviewById(id);
      if (existingReview.user_id !== userId) {
        throw new ApiError(403, "Bạn không có quyền sửa đánh giá này");
      }

      // Validate dữ liệu mới
      await this.validateReviewData(data);

      // Cập nhật review với tất cả thông tin (bao gồm cả ảnh)
      const updatedReview = await Review.update(id, {
        rating: data.rating,
        comment: data.comment || null,
        image_url: data.image_url || null,
        image_description: data.image_description || null,
        is_reported: false,
      });

      return await this.getReviewById(id);
    } catch (error) {
      throw error;
    }
  }

  // Kiểm tra điều kiện được phép review
  async canUserReview(userId, hospitalId) {
    try {
      // Kiểm tra xem user đã từng review chưa
      const hasReviewed = await Review.hasUserReviewed(userId, hospitalId);
      if (hasReviewed) {
        return {
          canReview: false,
          message: "Bạn đã đánh giá bệnh viện này rồi",
        };
      }

      return {
        canReview: true,
        message: "Bạn có thể đánh giá bệnh viện này",
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách review theo hospital
  async getHospitalReviews(hospitalId, { page = 1, limit = 10 } = {}) {
    try {
      const offset = (page - 1) * limit;

      // Sử dụng phương thức search với filter theo hospital_id
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
}

module.exports = new ReviewService();
