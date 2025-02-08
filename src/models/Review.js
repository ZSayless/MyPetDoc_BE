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

      // console.log("SQL:", sql);
      // console.log("Params:", params);

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
               u.avatar as user_avatar,
               h.name as hospital_name,
               COUNT(DISTINCT rr.id) as report_count,
               ru.full_name as replied_by_name,
               ru.avatar as replied_by_avatar,
               r.replied_at
        FROM ${this.tableName} r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN hospitals h ON r.hospital_id = h.id
        LEFT JOIN report_reasons rr ON r.id = rr.review_id
        LEFT JOIN users ru ON r.replied_by = ru.id
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

      // Convert offset and limit to number
      const limitNum = Number(limit);
      const offsetNum = Number(offset);

      const sql = `
        SELECT r.*, 
               u.full_name as user_name,
               u.avatar as user_avatar,
               h.name as hospital_name,
               COUNT(DISTINCT rr.id) as report_count,
               ru.full_name as replied_by_name,
               ru.avatar as replied_by_avatar
        FROM ${this.tableName} r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN hospitals h ON r.hospital_id = h.id
        LEFT JOIN report_reasons rr ON r.id = rr.review_id
        LEFT JOIN users ru ON r.replied_by = ru.id
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

  // Update review
  static async update(id, data) {
    try {
      // Lọc bỏ các giá trị undefined và null
      const validData = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
          validData[key] = value;
        }
      }

      // Kiểm tra nếu không có dữ liệu hợp lệ để update
      if (Object.keys(validData).length === 0) {
        throw new ApiError(400, "No valid data to update");
      }

      // Build câu SQL động dựa trên các field có giá trị
      const fields = Object.keys(validData)
        .map(key => `${key} = ?`)
        .join(", ");
      
      const values = Object.values(validData);

      const sql = `
        UPDATE ${this.tableName}
        SET ${fields}, updated_at = NOW()
        WHERE id = ?
      `;

      // Thêm id vào cuối mảng values
      values.push(id);

      const result = await this.query(sql, values);

      if (result.affectedRows === 0) {
        throw new ApiError(404, "Review not found");
      }

      // Lấy review đã update
      return await this.findById(id);
    } catch (error) {
      console.error("Error in update method:", error);
      throw error;
    }
  }

  // Delete review and image
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

  // Report review
  static async report(reviewId, reportData) {
    try {
      // Check report data
      if (!reviewId || !reportData.reported_by || !reportData.reason) {
        throw new Error("Missing report data");
      }

      // Add report to report_reasons table
      await ReportReason.create({
        review_id: reportData.review_id,
        reported_by: reportData.reported_by,
        reason: reportData.reason,
        pet_gallery_comment_id: null,
        pet_post_comment_id: null,
      });

      // Update is_reported status of review
      const updateReviewSql = `
        UPDATE ${this.tableName}
        SET is_reported = 1
        WHERE id = ?
      `;
      await this.query(updateReviewSql, [reviewId]);

      // Return updated review
      return await this.findById(reviewId);
    } catch (error) {
      console.error("Report review error:", error);
      throw error;
    }
  }

  // Get hospital stats with adjusted rating
  static async getHospitalStats(hospitalId) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_reviews,
          AVG(rating) as raw_rating,
          ROUND(
            CASE 
              WHEN COUNT(*) = 0 THEN 4.9
              ELSE (COUNT(*) * COALESCE(AVG(rating), 0) + 10 * 4.9) / (COUNT(*) + 10)
            END, 
            1
          ) as average_rating,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
        FROM ${this.tableName}
        WHERE hospital_id = ? AND is_deleted = 0
      `;

      const [stats] = await this.query(sql, [hospitalId]);

      // Make sure average_rating is a number
      if (stats) {
        stats.average_rating = parseFloat(stats.average_rating) || 4.9;
        stats.raw_rating = parseFloat(stats.raw_rating) || 0;
        
        // Convert counts to numbers
        stats.total_reviews = parseInt(stats.total_reviews);
        stats.five_star = parseInt(stats.five_star);
        stats.four_star = parseInt(stats.four_star);
        stats.three_star = parseInt(stats.three_star);
        stats.two_star = parseInt(stats.two_star);
        stats.one_star = parseInt(stats.one_star);
      }

      return stats;
    } catch (error) {
      console.error("Get hospital stats error:", error);
      throw error;
    }
  }

  // Check if user has reported review
  static async hasUserReported(userId, reviewId) {
    try {
      return await ReportReason.hasUserReported(userId, reviewId, null);
    } catch (error) {
      console.error("Check user reported error:", error);
      throw error;
    }
  }

  // Check if user has reviewed hospital
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

  // Toggle soft delete status of review
  static async toggleSoftDelete(id) {
    try {
      // Get current status
      const review = await this.findById(id);
      if (!review) {
        throw new ApiError(404, "Review not found");
      }

      // Toggle is_deleted status
      const sql = `
        UPDATE ${this.tableName}
        SET is_deleted = ?
        WHERE id = ?
      `;

      await this.query(sql, [!review.is_deleted, id]);

      // Return updated review
      return await this.findById(id);
    } catch (error) {
      console.error("Error in toggleSoftDelete:", error);
      throw error;
    }
  }

  // Restore soft deleted review
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

  // Hard delete review
  static async hardDelete(id) {
    try {
      // Check if review exists
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE id = ?
      `;

      const result = await this.query(sql, [id]);
      if (!result || result.length === 0) {
        throw new ApiError(404, "Review not found");
      }

      // Check if report_reasons table exists
      try {
        const checkTableSql = `
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name = 'report_reasons'
        `;
        const [tableExists] = await this.query(checkTableSql);

        if (tableExists && tableExists.count > 0) {
          // If table exists, delete related reports
          await this.query(
            `
            DELETE FROM report_reasons 
            WHERE review_id = ?
          `,
            [id]
          );
        }
      } catch (error) {
        console.log("Error when checking/deleting report:", error.message);
      }

      // Delete review
      const deleteReviewSql = `
        DELETE FROM ${this.tableName}
        WHERE id = ?
      `;
      await this.query(deleteReviewSql, [id]);

      return true;
    } catch (error) {
      console.error("Error in hardDelete:", error);
      throw error;
    }
  }

  static async deleteByUserId(userId) {
    const sql = "DELETE FROM reviews WHERE user_id = ?";
    return this.query(sql, [userId]);
  }

  static async reply(reviewId, hospitalAdminId, replyContent) {
    try {
      // Kiểm tra review tồn tại
      const review = await this.findById(reviewId);
      if (!review) {
        throw new ApiError(404, "Không tìm thấy đánh giá");
      }

      const sql = `
        UPDATE ${this.tableName}
        SET reply = ?,
            replied_by = ?,
            replied_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await this.query(sql, [replyContent, hospitalAdminId, reviewId]);
      return await this.findById(reviewId);
    } catch (error) {
      console.error("Reply to review error:", error);
      throw error;
    }
  }
}

module.exports = Review;
