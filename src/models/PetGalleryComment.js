const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");

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

  // Lấy danh sách comments của bài đăng
  static async getPostComments(galleryId, options = {}) {
    try {
      const page = Number(options.page || 1);
      const limit = Number(options.limit || 10);
      const offset = (page - 1) * limit;

      // Sử dụng string interpolation cho LIMIT và OFFSET
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

      // Chỉ sử dụng prepared statement cho gallery_id
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

  // Lấy replies của một comment
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

  // Thêm phương thức create
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
        throw new Error("Không thể tạo bình luận");
      }

      // Lấy comment vừa tạo
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

  // Lấy chi tiết comment
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
}

module.exports = PetGalleryComment;
