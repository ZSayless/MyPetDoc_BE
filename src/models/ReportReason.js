const BaseModel = require("./BaseModel");
const ApiError = require("../exceptions/ApiError");

class ReportReason extends BaseModel {
  static tableName = "report_reasons";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        resolved: data.resolved ? Boolean(data.resolved) : false,
      });
    }
  }

  static async create(data) {
    try {
      const sql = `
        INSERT INTO ${this.tableName} 
        (review_id, reported_by, reason, pet_gallery_comment_id, pet_post_comment_id)
        VALUES (?, ?, ?, ?, ?)
      `;

      const params = [
        data.review_id,
        data.reported_by,
        data.reason,
        data.pet_gallery_comment_id,
        data.pet_post_comment_id,
      ];

      const result = await this.query(sql, params);
      return result.insertId;
    } catch (error) {
      console.error("Error in ReportReason.create:", error);
      throw error;
    }
  }

  static async findByReviewId(reviewId) {
    const sql = `
      SELECT rr.*, u.name as reporter_name
      FROM ${this.tableName} rr
      LEFT JOIN users u ON rr.reported_by = u.id
      WHERE rr.review_id = ?
      ORDER BY rr.created_at DESC
    `;
    return await this.query(sql, [reviewId]);
  }

  static async hasUserReported(userId, reviewId, commentId) {
    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE reported_by = ? 
        AND (
          (review_id = ? AND ? IS NULL)
          OR 
          (pet_gallery_comment_id = ? AND ? IS NULL)
          OR
          (pet_post_comment_id = ? AND ? IS NULL)
        )
      `;

      const [result] = await this.query(sql, [
        userId,
        reviewId,
        commentId, // For review
        commentId,
        reviewId, // For comment
        commentId,
        reviewId, // For post comment
      ]);

      return result.count > 0;
    } catch (error) {
      console.error("Check user reported error:", error);
      throw error;
    }
  }

  static async resolve(id) {
    const sql = `
      UPDATE ${this.tableName}
      SET resolved = 1
      WHERE id = ?
    `;
    await this.query(sql, [id]);
    return true;
  }

  static async findAllWithDetails(filters = {}, options = {}) {
    try {
      const { offset = 0, limit = 10 } = options;

      // Base query với thông tin chi tiết
      let sql = `
        SELECT 
          rr.*,
          u.id as reporter_id,
          u.full_name as reporter_name,
          u.email as reporter_email,
          u.phone_number as reporter_phone,
          u.avatar as reporter_avatar,
          u.role as reporter_role,
          u.created_at as reporter_created_at,
          r.comment as review_content,
          r.rating as review_rating,
          r.hospital_id as review_hospital_id,
          h.name as hospital_name,
          pgc.content as gallery_comment_content,
          pg.caption as gallery_caption,
          ppc.content as post_comment_content,
          pp.title as post_title,
          CAST(rr.resolved AS UNSIGNED) as resolved
        FROM ${this.tableName} rr
        LEFT JOIN users u ON rr.reported_by = u.id
        LEFT JOIN reviews r ON rr.review_id = r.id
        LEFT JOIN hospitals h ON r.hospital_id = h.id
        LEFT JOIN pet_gallery_comments pgc ON rr.pet_gallery_comment_id = pgc.id
        LEFT JOIN pet_gallery pg ON pgc.gallery_id = pg.id
        LEFT JOIN pet_post_comments ppc ON rr.pet_post_comment_id = ppc.id
        LEFT JOIN pet_posts pp ON ppc.post_id = pp.id
      `;

      // Build WHERE conditions
      const whereConditions = [];
      const params = [];

      if (filters.resolved !== undefined) {
        whereConditions.push("rr.resolved = ?");
        params.push(filters.resolved);
      }

      if (filters.reportType) {
        switch (filters.reportType) {
          case "review":
            whereConditions.push("rr.review_id IS NOT NULL");
            break;
          case "gallery_comment":
            whereConditions.push("rr.pet_gallery_comment_id IS NOT NULL");
            break;
          case "post_comment":
            whereConditions.push("rr.pet_post_comment_id IS NOT NULL");
            break;
        }
      }

      if (whereConditions.length > 0) {
        sql += ` WHERE ${whereConditions.join(" AND ")}`;
      }

      // Add ORDER BY and LIMIT - bỏ rr.created_at
      sql += ` ORDER BY rr.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

      const reports = await this.query(sql, params);
      return reports;
    } catch (error) {
      console.error("Find all reports with details error:", error);
      throw error;
    }
  }

  static async countReports(filters = {}) {
    try {
      let sql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const whereConditions = [];
      const params = [];

      if (filters.resolved !== undefined) {
        whereConditions.push("resolved = ?");
        params.push(filters.resolved);
      }

      if (filters.reportType) {
        switch (filters.reportType) {
          case "review":
            whereConditions.push("review_id IS NOT NULL");
            break;
          case "gallery_comment":
            whereConditions.push("pet_gallery_comment_id IS NOT NULL");
            break;
          case "post_comment":
            whereConditions.push("pet_post_comment_id IS NOT NULL");
            break;
        }
      }

      if (whereConditions.length > 0) {
        sql += ` WHERE ${whereConditions.join(" AND ")}`;
      }

      const [result] = await this.query(sql, params);
      return result.total;
    } catch (error) {
      console.error("Count reports error:", error);
      throw error;
    }
  }

  static async findOneWithDetails(id) {
    try {
      const sql = `
        SELECT 
          rr.*,
          u.id as reporter_id,
          u.full_name as reporter_name,
          u.email as reporter_email,
          u.phone_number as reporter_phone,
          u.avatar as reporter_avatar,
          u.role as reporter_role,
          u.created_at as reporter_created_at,
          r.comment as review_content,
          r.rating as review_rating,
          r.hospital_id as review_hospital_id,
          h.name as hospital_name,
          pgc.content as gallery_comment_content,
          pg.caption as gallery_caption,
          ppc.content as post_comment_content,
          pp.title as post_title,
          CAST(rr.resolved AS UNSIGNED) as resolved
        FROM ${this.tableName} rr
        LEFT JOIN users u ON rr.reported_by = u.id
        LEFT JOIN reviews r ON rr.review_id = r.id
        LEFT JOIN hospitals h ON r.hospital_id = h.id
        LEFT JOIN pet_gallery_comments pgc ON rr.pet_gallery_comment_id = pgc.id
        LEFT JOIN pet_gallery pg ON pgc.gallery_id = pg.id
        LEFT JOIN pet_post_comments ppc ON rr.pet_post_comment_id = ppc.id
        LEFT JOIN pet_posts pp ON ppc.post_id = pp.id
        WHERE rr.id = ?
      `;

      const [report] = await this.query(sql, [id]);
      return report;
    } catch (error) {
      console.error("Find one report with details error:", error);
      throw error;
    }
  }

  static async forceDelete(id) {
    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await this.query(sql, [id]);
      
      if (result.affectedRows === 0) {
        throw new ApiError(404, "Report not found");
      }
      
      return true;
    } catch (error) {
      console.error("Force delete report error:", error);
      throw error;
    }
  }
}

module.exports = ReportReason;
