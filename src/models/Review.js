const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");
const ApiError = require("../exceptions/ApiError");

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

      const result = await this.query(sql, params);
      return await this.findById(result.insertId);
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
      // Kiểm tra review tồn tại
      const review = await this.findById(id);
      if (!review) {
        throw new ApiError(404, "Không tìm thấy review");
      }

      // Chuẩn bị dữ liệu cập nhật
      const updateData = {
        rating: data.rating,
        comment: data.comment,
        image_url: data.image_url,
        image_description: data.image_description,
        updated_at: new Date(),
      };

      // Lọc bỏ các trường undefined/null
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
      );

      if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, "Không có dữ liệu để cập nhật");
      }

      // Tạo câu query UPDATE
      const setClause = Object.keys(updateData)
        .map((key) => `${key} = ?`)
        .join(", ");

      const sql = `
        UPDATE ${this.tableName}
        SET ${setClause}
        WHERE id = ?
      `;

      // Thực hiện cập nhật
      await this.query(sql, [...Object.values(updateData), id]);

      // Trả về review đã cập nhật
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
      // Cập nhật trạng thái báo cáo của review
      await this.update(reviewId, { is_reported: true });

      // Thêm lý do báo cáo
      const sql = `
        INSERT INTO report_reasons (reason, reported_by, review_id)
        VALUES (?, ?, ?)
      `;

      await this.query(sql, [
        reportData.reason,
        reportData.reported_by,
        reviewId,
      ]);

      return await this.findById(reviewId);
    } catch (error) {
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

  // Kiểm tra user đã báo cáo review này chưa
  static async hasUserReported(userId, reviewId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM report_reasons
      WHERE reported_by = ? AND review_id = ?
    `;
    const [result] = await this.query(sql, [userId, reviewId]);
    return result.count > 0;
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
