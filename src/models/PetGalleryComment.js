const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");
const ReportReason = require("./ReportReason");

class PetGalleryComment extends BaseModel {
  static tableName = "pet_gallery_comments";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        is_deleted: convertBitToBoolean(data.is_deleted),
      });
    }
  }

  // Get list of comments of post
  static async getPostComments(galleryId, options = {}) {
    try {
      const page = Number(options.page || 1);
      const limit = Number(options.limit || 10);
      const offset = (page - 1) * limit;

      // Use string interpolation for LIMIT and OFFSET
      const sql = `
        SELECT c.*, 
               u.full_name as user_name,
               u.avatar as user_avatar,
               (SELECT COUNT(*) FROM ${this.tableName} WHERE parent_id = c.id AND is_deleted = 0) as replies_count
        FROM ${this.tableName} c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.gallery_id = ? 
        AND c.parent_id IS NULL 
        AND c.is_deleted = 0
        ORDER BY c.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        WHERE gallery_id = ? 
        AND parent_id IS NULL 
        AND is_deleted = 0
      `;

      // Only use prepared statement for gallery_id
      const [comments, [countResult]] = await Promise.all([
        this.query(sql, [Number(galleryId)]),
        this.query(countSql, [Number(galleryId)]),
      ]);

      return {
        comments: comments.map((comment) => ({
          ...comment,
          is_deleted: Boolean(comment.is_deleted),
        })),
        pagination: {
          page: page,
          limit: limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
        },
      };
    } catch (error) {
      console.error("Get post comments error:", error);
      console.error("Error details:", {
        galleryId,
        options,
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // Get replies of a comment
  static async getReplies(commentId, options = {}) {
    try {
      const { page = 1, limit = 10, includeDeleted = false } = options;

      const offset = (page - 1) * limit;

      const sql = `
        SELECT c.*, 
               u.full_name as user_name,
               u.avatar_url as user_avatar
        FROM ${this.tableName} c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.parent_id = ?
        ${!includeDeleted ? "AND c.is_deleted = 0" : ""}
        ORDER BY c.created_at ASC
        LIMIT ? OFFSET ?
      `;

      const replies = await this.query(sql, [commentId, limit, offset]);
      return replies.map((reply) => new PetGalleryComment(reply));
    } catch (error) {
      console.error("Get comment replies error:", error);
      throw error;
    }
  }

  // Add create method
  static async create(data) {
    try {
      const sql = `
        INSERT INTO ${this.tableName} 
        (gallery_id, user_id, content, parent_id) 
        VALUES (?, ?, ?, ?)
      `;

      const params = [
        Number(data.gallery_id),
        Number(data.user_id),
        data.content,
        data.parent_id ? Number(data.parent_id) : null,
      ];

      const result = await this.query(sql, params);

      if (!result.insertId) {
        throw new Error("Cannot create comment");
      }

      // Get created comment
      const [comment] = await this.query(
        `SELECT c.*, u.full_name as user_name, u.avatar as user_avatar
         FROM ${this.tableName} c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`,
        [result.insertId]
      );

      return comment;
    } catch (error) {
      console.error("Create comment error:", error);
      console.error("Create comment data:", data);
      throw error;
    }
  }

  // Get comment detail
  static async getDetail(id) {
    try {
      const [comment] = await this.query(
        `SELECT c.*, u.full_name as user_name, u.avatar as user_avatar
         FROM ${this.tableName} c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`,
        [Number(id)]
      );

      return comment;
    } catch (error) {
      console.error("Get comment detail error:", error);
      throw error;
    }
  }

  // Report comment
  static async report(commentId, reportData) {
    try {
      // Check input data
      if (!commentId || !reportData.reported_by || !reportData.reason) {
        throw new Error("Missing report data");
      }

      // Check comment exists
      const [comment] = await this.query(
        `SELECT * FROM ${this.tableName} WHERE id = ? AND is_deleted = 0`,
        [commentId]
      );

      if (!comment) {
        throw new ApiError(404, "Comment not found");
      }

      // Add report to report_reasons table
      const reportResult = await ReportReason.create({
        pet_gallery_comment_id: commentId,
        reported_by: reportData.reported_by,
        reason: reportData.reason,
        review_id: null,
        pet_post_comment_id: null,
      });

      // Update is_reported status of comment
      await this.query(
        `UPDATE ${this.tableName} SET is_reported = 1 WHERE id = ?`,
        [commentId]
      );

      return {
        comment_id: commentId,
        report_id: reportResult,
        reported_by: reportData.reported_by,
        reason: reportData.reason,
        created_at: new Date(),
      };
    } catch (error) {
      console.error("Report comment error:", error);
      throw error;
    }
  }

  // Check if user has reported comment
  static async hasUserReported(userId, commentId) {
    try {
      return await ReportReason.hasUserReported(userId, null, commentId);
    } catch (error) {
      console.error("Check user reported error:", error);
      throw error;
    }
  }

  // Delete comment and related reports
  static async deleteWithReports(commentId, userId = null, isAdmin = false) {
    try {
      // Get comment info
      const [comment] = await this.query(
        `SELECT c.*, g.user_id as post_owner_id 
         FROM ${this.tableName} c
         LEFT JOIN pet_gallery g ON c.gallery_id = g.id
         WHERE c.id = ?`,
        [commentId]
      );

      if (!comment) {
        throw new Error("Comment not found");
      }

      // Check delete permission if not admin
      if (!isAdmin) {
        const canDelete =
          userId === comment.user_id || // User who wrote comment
          userId === comment.post_owner_id; // Post owner

        if (!canDelete) {
          throw new Error("No permission to delete this comment");
        }
      }

      // If it's a root comment, handle replies first
      if (!comment.parent_id) {
        // Get list of replies
        const replies = await this.query(
          `SELECT id FROM ${this.tableName} WHERE parent_id = ?`,
          [Number(commentId)]
        );

        if (replies.length > 0) {
          const replyIds = replies.map((reply) => reply.id);

          // Delete reports of replies first
          await this.query(
            `DELETE FROM report_reasons WHERE pet_gallery_comment_id IN (?)`,
            [replyIds]
          );

          // Then delete replies
          await this.query(
            `DELETE FROM ${this.tableName} WHERE parent_id = ?`,
            [Number(commentId)]
          );
        }
      }

      // Delete reports of root comment
      await this.query(
        `DELETE FROM report_reasons WHERE pet_gallery_comment_id = ?`,
        [Number(commentId)]
      );

      // Finally delete comment
      await this.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [
        Number(commentId),
      ]);

      // Update comments count in post
      await this.query(
        `UPDATE pet_gallery g 
         SET comments_count = (
           SELECT COUNT(*) 
           FROM ${this.tableName} 
           WHERE gallery_id = g.id AND is_deleted = 0
         )
         WHERE id = ?`,
        [comment.gallery_id]
      );

      return true;
    } catch (error) {
      console.error("Delete comment error:", error);
      throw error;
    }
  }

  // Delete comment without checking permission
  static async forceDelete(commentId) {
    try {
      // Get comment info
      const [comment] = await this.query(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [commentId]
      );

      if (!comment) {
        return; // If comment not found, skip
      }

      // If it's a root comment, handle replies first
      if (!comment.parent_id) {
        // Get list of replies
        const replies = await this.query(
          `SELECT id FROM ${this.tableName} WHERE parent_id = ?`,
          [Number(commentId)]
        );

        if (replies.length > 0) {
          const replyIds = replies.map((reply) => reply.id);

          // Delete reports of replies
          await this.query(
            `DELETE FROM report_reasons WHERE pet_gallery_comment_id IN (?)`,
            [replyIds]
          );

          // Delete replies
          await this.query(
            `DELETE FROM ${this.tableName} WHERE parent_id = ?`,
            [Number(commentId)]
          );
        }
      }

      // Delete reports of root comment
      await this.query(
        `DELETE FROM report_reasons WHERE pet_gallery_comment_id = ?`,
        [Number(commentId)]
      );

      // Delete comment
      await this.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [
        Number(commentId),
      ]);

      return true;
    } catch (error) {
      console.error("Force delete comment error:", error);
      throw error;
    }
  }
}

module.exports = PetGalleryComment;
