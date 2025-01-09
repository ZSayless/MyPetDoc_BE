const Review = require("../models/Review");
const Hospital = require("../models/Hospital");
const ApiError = require("../exceptions/ApiError");
const path = require("path");
const fs = require("fs");
const cloudinary = require("../config/cloudinary");

class ReviewService {
  // Tạo review mới
  async createReview(data, userId, file = null) {
    try {
      // Validate dữ liệu cơ bản
      await this.validateReviewData(data, file);

      // Kiểm tra đã review chưa
      const hasReviewed = await Review.hasUserReviewed(
        userId,
        data.hospital_id
      );
      if (hasReviewed) {
        throw new ApiError(400, "Bạn đã đánh giá bệnh viện này rồi");
      }

      // Chuẩn bị dữ liệu review
      const reviewData = {
        user_id: userId,
        hospital_id: parseInt(data.hospital_id),
        rating: parseInt(data.rating) || 5,
        comment: data.comment || null,
        image_url: file ? file.path : null,
        image_description: data.image_description || null,
      };

      console.log("Creating review with data:", reviewData);

      const result = await Review.create(reviewData);
      console.log("Create result:", result);

      // Lấy review vừa tạo
      const review = await Review.findById(result.insertId);
      if (!review) {
        throw new ApiError(500, "Không thể tạo review");
      }

      return review;
    } catch (error) {
      // Nếu có lỗi và đã upload ảnh, xóa ảnh trên Cloudinary
      if (file && file.path) {
        try {
          const urlParts = file.path.split("/");
          const publicId = `reviews/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Lỗi khi xóa ảnh trên Cloudinary:", deleteError);
        }
      }
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
      if (!review) {
        throw new ApiError(404, "Không tìm thấy đánh giá này");
      }

      // Kiểm tra xem user đã báo cáo review này chưa
      const hasReported = await Review.hasUserReported(userId, reviewId);
      if (hasReported) {
        throw new ApiError(400, "Bạn đã báo cáo đánh giá này rồi");
      }

      // Chuẩn bị dữ liệu báo cáo
      const reportWithUser = {
        review_id: reviewId,
        reported_by: userId,
        reason: reportData.reason || "Không có lý do",
        created_at: new Date(),
      };

      // Thêm báo cáo và cập nhật trạng thái review
      const result = await Review.report(reviewId, reportWithUser);

      return {
        success: true,
        message: "Đã báo cáo đánh giá thành công",
        data: result,
      };
    } catch (error) {
      console.error("Report review error:", error);
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
  async validateReviewData(data, file = null, isUpdate = false) {
    const errors = [];

    // Validate hospital_id (chỉ bắt buộc khi tạo mới)
    if (!isUpdate && !data.hospital_id) {
      errors.push("Hospital ID là bắt buộc");
    }

    // Validate rating nếu có
    if (data.rating !== undefined) {
      const rating = parseInt(data.rating);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        errors.push("Rating phải từ 1-5");
      }
    }

    // Khi tạo mới: phải có ít nhất comment hoặc ảnh
    // Khi cập nhật: không bắt buộc
    if (!isUpdate && !data.comment && !file) {
      errors.push("Review phải có ít nhất comment hoặc ảnh");
    }

    // Validate comment nếu có
    if (data.comment && data.comment.trim().length < 10) {
      errors.push("Comment phải có ít nhất 10 ký tự");
    }

    // Validate image_description nếu có ảnh mới
    if (file && !data.image_description) {
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
      const review = await Review.findById(id);
      if (!review) {
        throw new ApiError(404, "Không tìm thấy review");
      }

      // Kiểm tra quyền xóa
      if (userRole !== "ADMIN" && review.user_id !== userId) {
        throw new ApiError(403, "Bạn không có quyền thực hiện hành động này");
      }

      // Toggle trạng thái xóa
      const updatedReview = await Review.toggleSoftDelete(id);

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
  async hardDelete(id) {
    try {
      // Lấy thông tin review trước khi xóa
      const review = await Review.findById(id);
      if (!review) {
        throw new ApiError(404, "Không tìm thấy review");
      }

      // Xóa ảnh trên Cloudinary nếu có
      if (review.photo.image_url) {
        try {
          const imageUrl = review.photo.image_url;

          const urlParts = imageUrl.split("/");
          const filename = urlParts[urlParts.length - 1].split(".")[0];
          const publicId = `reviews/${filename}`;

          await cloudinary.uploader.destroy(publicId);
        } catch (cloudinaryError) {
          console.error("Lỗi khi xóa ảnh trên Cloudinary:", cloudinaryError);
        }
      } else {
        console.log("Không tìm thấy URL ảnh để xóa");
      }

      // Xóa các báo cáo liên quan
      await Review.query("DELETE FROM report_reasons WHERE review_id = ?", [
        id,
      ]);

      // Xóa review
      await Review.hardDelete(id);

      return {
        status: "success",
        message: "Đã xóa vĩnh viễn đánh giá thành công",
      };
    } catch (error) {
      console.error("Error in ReviewService.hardDelete:", error);
      throw error;
    }
  }

  // Cập nhật review
  async updateReview(id, data, userId, file = null) {
    try {
      // Lấy review hiện tại
      const existingReview = await Review.findById(id);
      if (!existingReview) {
        throw new ApiError(404, "Không tìm thấy review");
      }

      // Kiểm tra quyền
      if (existingReview.user_id !== userId) {
        throw new ApiError(403, "Bạn không có quyền sửa review này");
      }

      // Validate dữ liệu mới (với isUpdate = true)
      await this.validateReviewData(data, file, true);

      // Nếu có ảnh mới và có ảnh cũ, xóa ảnh cũ trên Cloudinary
      if (file && existingReview.photo && existingReview.photo.image_url) {
        try {
          const urlParts = existingReview.photo.image_url.split("/");
          const publicId = `reviews/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Lỗi khi xóa ảnh cũ trên Cloudinary:", deleteError);
        }
      }

      // Chuẩn bị dữ liệu cập nhật
      const updateData = {
        rating: data.rating ? parseInt(data.rating) : existingReview.rating,
        comment:
          data.comment !== undefined ? data.comment : existingReview.comment,
        image_url: file
          ? file.path
          : existingReview.photo
          ? existingReview.photo.image_url
          : null,
        image_description:
          data.image_description !== undefined
            ? data.image_description
            : existingReview.photo
            ? existingReview.photo.description
            : null,
      };

      // Cập nhật review
      const updatedReview = await Review.update(id, updateData);

      console.log("Review đã được cập nhật:", updatedReview);
      return updatedReview;
    } catch (error) {
      // Nếu có lỗi và đã upload ảnh mới, xóa ảnh mới trên Cloudinary
      if (file && file.path) {
        try {
          const urlParts = file.path.split("/");
          const publicId = `reviews/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Lỗi khi xóa ảnh mới trên Cloudinary:", deleteError);
        }
      }
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
      // Lấy thông tin review trước khi xóa
      const review = await Review.findById(id);
      if (!review) {
        throw new ApiError(404, "Không tìm thấy review");
      }

      // Kiểm tra quyền xóa
      if (!isAdmin && review.user_id !== userId) {
        throw new ApiError(403, "Bạn không có quyền xóa review này");
      }

      // Xóa review trong database
      await Review.softDelete(id);

      return {
        success: true,
        message: "Đã xóa review thành công",
      };
    } catch (error) {
      console.error("Lỗi khi xóa review:", error);
      throw error;
    }
  }
}

module.exports = new ReviewService();
