const BaseModel = require("./BaseModel");

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
        commentId, // Cho review
        commentId,
        reviewId, // Cho comment
        commentId,
        reviewId, // Cho post comment
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
}

module.exports = ReportReason;
