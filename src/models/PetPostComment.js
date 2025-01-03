const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");

class PetPostComment extends BaseModel {
  static tableName = "pet_post_comments";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        is_deleted: convertBitToBoolean(data.is_deleted),
      });
    }
  }

  static async getPostComments(postId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      console.log("Getting comments for postId:", postId);
      console.log("Pagination:", { page, limit, offset });

      // Query chính
      const sql = `
        SELECT 
          c.*, 
          u.full_name as user_name,
          u.avatar as user_avatar,
          (
            SELECT COUNT(*) 
            FROM ${this.tableName} r 
            WHERE r.parent_id = c.id AND r.is_deleted = 0
          ) as replies_count
        FROM ${this.tableName} c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ${postId}
        AND c.parent_id IS NULL 
        AND c.is_deleted = 0
        ORDER BY c.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      console.log("Main SQL:", sql);
      console.log("SQL params:", [postId, limit, offset]);

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        WHERE post_id = ${postId}
        AND parent_id IS NULL
        AND is_deleted = 0
      `;

      const [comments, [countResult]] = await Promise.all([
        this.query(sql),
        this.query(countSql),
      ]);

      console.log("Raw comments:", comments);
      console.log("Count result:", countResult);

      // Lấy replies cho mỗi comment
      const commentsWithReplies = await Promise.all(
        comments.map(async (comment) => {
          const repliesSql = `
            SELECT 
              r.*,
              u.full_name as user_name,
              u.avatar as user_avatar
            FROM ${this.tableName} r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.parent_id = ${comment.id}
            AND r.is_deleted = 0
            ORDER BY r.created_at ASC
          `;

          console.log("Getting replies for comment:", comment.id);
          const replies = await this.query(repliesSql);
          console.log("Replies found:", replies.length);

          return {
            ...comment,
            is_deleted: Boolean(comment.is_deleted),
            replies: replies.map((reply) => ({
              ...reply,
              is_deleted: Boolean(reply.is_deleted),
            })),
          };
        })
      );

      console.log("Final comments with replies:", commentsWithReplies);

      const result = {
        comments: commentsWithReplies,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
        },
      };

      console.log("Final result:", result);
      return result;
    } catch (error) {
      console.error("Get post comments error:", error);
      console.error("Error stack:", error.stack);
      throw error;
    }
  }

  static async getReplies(commentId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const sql = `
        SELECT c.*, 
               u.full_name as user_name,
               u.avatar as user_avatar
        FROM ${this.tableName} c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.parent_id = ?
        ORDER BY c.created_at ASC
        LIMIT ? OFFSET ?
      `;

      const replies = await this.query(sql, [commentId, limit, offset]);
      return replies.map((reply) => new PetPostComment(reply));
    } catch (error) {
      console.error("Get replies error:", error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const sql = `
        INSERT INTO ${this.tableName} 
        (post_id, user_id, content, parent_id) 
        VALUES (?, ?, ?, ?)
      `;

      const params = [
        Number(data.post_id),
        Number(data.user_id),
        data.content,
        data.parent_id ? Number(data.parent_id) : null,
      ];

      const result = await this.query(sql, params);

      const [comment] = await this.query(
        `SELECT c.*, u.full_name as user_name, u.avatar as user_avatar
         FROM ${this.tableName} c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.id = ?`,
        [result.insertId]
      );

      return new PetPostComment(comment);
    } catch (error) {
      console.error("Create comment error:", error);
      throw error;
    }
  }

  static async delete(commentId, userId, isAdmin = false) {
    try {
      const [comment] = await this.query(
        `SELECT user_id, post_id FROM ${this.tableName} WHERE id = ?`,
        [commentId]
      );

      if (!comment) {
        throw new Error("Không tìm thấy bình luận");
      }

      // Cho phép admin hoặc chủ bình luận xóa
      if (!isAdmin && comment.user_id !== userId) {
        throw new Error("Không có quyền xóa bình luận này");
      }

      const sql = `
        DELETE FROM ${this.tableName}
        WHERE id = ? OR parent_id = ?
      `;

      await this.query(sql, [commentId, commentId]);

      if (comment.post_id) {
        const PetPost = require("./PetPost");
        await PetPost.updateCounts(comment.post_id);
      }

      return true;
    } catch (error) {
      console.error("Delete comment error:", error);
      throw error;
    }
  }

  static async deleteAllByPostId(postId) {
    try {
      const sql = `
        DELETE FROM ${this.tableName}
        WHERE post_id = ?
      `;

      await this.query(sql, [postId]);
      return true;
    } catch (error) {
      console.error("Delete all comments error:", error);
      throw error;
    }
  }

  static async update(commentId, userId, content) {
    try {
      const [comment] = await this.query(
        `SELECT user_id FROM ${this.tableName} WHERE id = ? AND is_deleted = 0`,
        [commentId]
      );

      if (!comment) {
        throw new Error("Không tìm thấy bình luận hoặc bình luận đã bị xóa");
      }

      if (comment.user_id !== userId) {
        throw new Error("Không có quyền sửa bình luận này");
      }

      const sql = `
        UPDATE ${this.tableName}
        SET content = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await this.query(sql, [content, commentId]);

      return await this.getDetail(commentId);
    } catch (error) {
      console.error("Update comment error:", error);
      throw error;
    }
  }

  static async getDetail(commentId) {
    try {
      const sql = `
        SELECT c.*, 
               u.full_name as user_name,
               u.avatar as user_avatar
        FROM ${this.tableName} c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `;

      const [comment] = await this.query(sql, [commentId]);
      if (!comment) return null;

      return new PetPostComment(comment);
    } catch (error) {
      console.error("Get comment detail error:", error);
      throw error;
    }
  }

  static async isOwnedByUser(commentId, userId) {
    try {
      const [comment] = await this.query(
        `SELECT user_id FROM ${this.tableName} WHERE id = ?`,
        [commentId]
      );

      return comment && comment.user_id === userId;
    } catch (error) {
      console.error("Check comment ownership error:", error);
      throw error;
    }
  }

  static async getPostCommentsCount(postId) {
    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE post_id = ? AND is_deleted = 0
      `;

      const [result] = await this.query(sql, [postId]);
      return result.count;
    } catch (error) {
      console.error("Get post comments count error:", error);
      throw error;
    }
  }
}

module.exports = PetPostComment;
