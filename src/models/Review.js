const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");
const ApiError = require("../exceptions/ApiError");
const ReportReason = require("./ReportReason");

class Review extends BaseModel {
  static tableName = "reviews";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        is_deleted: convertBitToBoolean(data.is_deleted),
        is_reported: convertBitToBoolean(data.is_reported),
      });
    }
  }

  static async create(data) {
    try {
      const sql = `
        INSERT INTO ${this.tableName} 
        (user_id, hospital_id, rating, comment, image_url, image_description, is_reported, is_deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        data.user_id,
        data.hospital_id,
        data.rating,
        data.comment || null,
        data.image_url || null,
        data.image_description || null,
        false, // is_reported
        false, // is_deleted
      ];

      console.log("SQL:", sql);
      console.log("Params:", params);

      const result = await this.query(sql, params);
      return result;
    } catch (error) {
      console.error("Error in create method:", error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const sql = `
        SELECT r.*, 
               u.full_name as user_name,
               h.name as hospital_name,
               COUNT(DISTINCT rr.id) as report_count
        FROM ${this.tableName} r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN hospitals h ON r.hospital_id = h.id
        LEFT JOIN report_reasons rr ON r.id = rr.review_id
        WHERE r.id = ?
        GROUP BY r.id
      `;

      const result = await this.query(sql, [id]);
      if (!result || result.length === 0) return null;

      const review = new Review(result[0]);

      // Format photo data if exists
      if (review.image_url) {
        review.photo = {
          image_url: review.image_url,
          description: review.image_description,
        };
        // Remove redundant fields
        delete review.image_url;
        delete review.image_description;
      }

      return review;
    } catch (error) {
      console.error("Error in findById:", error);
      throw error;
    }
  }

  static async search(filters = {}, { offset = 0, limit = 10 } = {}) {
    try {
      let conditions = ["r.is_deleted = 0"];
      const params = [];

      if (filters.hospital_id) {
        conditions.push("r.hospital_id = ?");
        params.push(filters.hospital_id);
      }

      if (filters.user_id) {
        conditions.push("r.user_id = ?");
        params.push(filters.user_id);
      }

      if (filters.rating) {
        conditions.push("r.rating = ?");
        params.push(filters.rating);
      }

      if (filters.is_reported !== undefined) {
        conditions.push("r.is_reported = ?");
        params.push(filters.is_reported);
      }

      // Convert offset và limit sang số
      const limitNum = Number(limit);
      const offsetNum = Number(offset);

      const sql = `
        SELECT r.*, 
               u.full_name as user_name,
               h.name as hospital_name,
               COUNT(DISTINCT rr.id) as report_count
        FROM ${this.tableName} r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN hospitals h ON r.hospital_id = h.id
        LEFT JOIN report_reasons rr ON r.id = rr.review_id
        WHERE ${conditions.join(" AND ")}
        GROUP BY r.id
        ORDER BY r.created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `;

      const countSql = `
        SELECT COUNT(DISTINCT r.id) as total
        FROM ${this.tableName} r
        WHERE ${conditions.join(" AND ")}
      `;

      const [reviews, [countResult]] = await Promise.all([
        this.query(sql, params),
        this.query(countSql, params),
      ]);

      const formattedReviews = reviews.map((review) => {
        const formattedReview = new Review(review);
        if (formattedReview.image_url) {
          formattedReview.photo = {
            image_url: formattedReview.image_url,
            description: formattedReview.image_description,
          };
          delete formattedReview.image_url;
          delete formattedReview.image_description;
        }
        return formattedReview;
      });

      return {
        reviews: formattedReviews,
        pagination: {
          total: countResult.total,
          page: Math.floor(offsetNum / limitNum) + 1,
          limit: limitNum,
          totalPages: Math.ceil(countResult.total / limitNum),
        },
      };
    } catch (error) {
      console.error("Error in search method:", error);
      throw error;
    }
  }

  // Cập nhật review
  static async update(id, data) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET rating = ?,
            comment = ?,
            image_url = ?,
            image_description = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const params = [
        data.rating,
        data.comment,
        data.image_url,
        data.image_description,
        id,
      ];

      await this.query(sql, params);
      return await this.findById(id);
    } catch (error) {
      console.error("Error in update method:", error);
      throw error;
    }
  }

  // Xóa review và ảnh
  static async softDelete(id) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET is_deleted = 1
        WHERE id = ?
      `;

      await this.query(sql, [id]);
      return true;
    } catch (error) {
      console.error("Error in softDelete:", error);
      throw error;
    }
  }

  // Báo cáo review
  static async report(reviewId, reportData) {
    try {
      // Kiểm tra dữ liệu đầu vào
      if (!reviewId || !reportData.reported_by || !reportData.reason) {
        throw new Error("Thiếu thông tin báo cáo");
      }

      // Thêm báo cáo vào bảng report_reasons
      await ReportReason.create({
        review_id: reportData.review_id,
        reported_by: reportData.reported_by,
        reason: reportData.reason,
        pet_gallery_comment_id: null,
        pet_post_comment_id: null,
      });

      // Cập nhật trạng thái is_reported của review
      const updateReviewSql = `
        UPDATE ${this.tableName}
        SET is_reported = 1
        WHERE id = ?
      `;
      await this.query(updateReviewSql, [reviewId]);

      // Trả về review đã cập nhật
      return await this.findById(reviewId);
    } catch (error) {
      console.error("Report review error:", error);
      throw error;
    }
  }

  // Lấy thống kê đánh giá của bệnh viện
  static async getHospitalStats(hospitalId) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_reviews,
          AVG(rating) as average_rating,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
        FROM ${this.tableName}
        WHERE hospital_id = ? AND is_deleted = 0
      `;

      const [stats] = await this.query(sql, [hospitalId]);
      return stats;
    } catch (error) {
      throw error;
    }
  }

  // Kiểm tra user đã báo cáo review chưa
  static async hasUserReported(userId, reviewId) {
    try {
      return await ReportReason.hasUserReported(userId, reviewId, null);
    } catch (error) {
      console.error("Check user reported error:", error);
      throw error;
    }
  }

  // Kiểm tra user đã review bệnh viện chưa
  static async hasUserReviewed(userId, hospitalId) {
    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE user_id = ? AND hospital_id = ? AND is_deleted = 0
      `;

      const [result] = await this.query(sql, [userId, hospitalId]);
      return result.count > 0;
    } catch (error) {
      throw error;
    }
  }

  // Toggle trạng thái xóa của review
  static async toggleSoftDelete(id) {
    try {
      // Lấy trạng thái hiện tại
      const review = await this.findById(id);
      if (!review) {
        throw new ApiError(404, "Không tìm thấy review");
      }

      // Toggle trạng thái is_deleted
      const sql = `
        UPDATE ${this.tableName}
        SET is_deleted = ?
        WHERE id = ?
      `;

      await this.query(sql, [!review.is_deleted, id]);

      // Trả về review sau khi cập nhật
      return await this.findById(id);
    } catch (error) {
      console.error("Error in toggleSoftDelete:", error);
      throw error;
    }
  }

  // Khôi phục review đã xóa mềm
  static async restore(id) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET is_deleted = 0
        WHERE id = ?
      `;

      await this.query(sql, [id]);
      return await this.findById(id);
    } catch (error) {
      console.error("Error in restore:", error);
      throw error;
    }
  }

  // Xóa cứng review
  static async hardDelete(id) {
    try {
      // Kiểm tra review tồn tại
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE id = ?
      `;

      const result = await this.query(sql, [id]);
      if (!result || result.length === 0) {
        throw new ApiError(404, "Không tìm thấy review");
      }

      // Kiểm tra bảng report_reasons có tồn tại không
      try {
        const checkTableSql = `
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name = 'report_reasons'
        `;
        const [tableExists] = await this.query(checkTableSql);

        if (tableExists && tableExists.count > 0) {
          // Nếu bảng tồn tại, xóa các báo cáo liên quan
          await this.query(
            `
            DELETE FROM report_reasons 
            WHERE review_id = ?
          `,
            [id]
          );
        }
      } catch (error) {
        console.log("Lỗi khi kiểm tra/xóa báo cáo:", error.message);
      }

      // Xóa review
      const deleteReviewSql = `
        DELETE FROM ${this.tableName}
        WHERE id = ?
      `;
      await this.query(deleteReviewSql, [id]);

      return true;
    } catch (error) {
      console.error("Error in delete:", error);
      throw error;
    }
  }
}

module.exports = Review;
