const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");

class PetPost extends BaseModel {
  static tableName = "pet_posts";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        is_deleted: convertBitToBoolean(data.is_deleted),
        is_featured: convertBitToBoolean(data.is_featured),
      });
    }
  }

  // Get list of posts with pagination and filter
  static async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        postType,
        category,
        status = "PUBLISHED",
        authorId,
        hospitalId,
        tags,
        isFeatured,
        sortBy = "created_at",
        sortOrder = "DESC",
        includeDeleted = false,
      } = options;

      // console.log("Query options:", options);

      const offset = (page - 1) * limit;
      let conditions = [];
      let params = [];

      if (!includeDeleted) {
        conditions.push("p.is_deleted = ?");
        params.push(0);
      }

      if (postType) {
        conditions.push("p.post_type = ?");
        params.push(postType);
      }

      if (category) {
        conditions.push("p.category = ?");
        params.push(category);
      }

      if (status) {
        conditions.push("p.status = ?");
        params.push(status);
      }

      if (authorId) {
        conditions.push("p.author_id = ?");
        params.push(Number(authorId));
      }

      if (hospitalId) {
        conditions.push("p.hospital_id = ?");
        params.push(Number(hospitalId));
      }

      if (tags) {
        conditions.push("p.tags LIKE ?");
        params.push(`%${tags}%`);
      }

      if (isFeatured !== undefined) {
        conditions.push("p.is_featured = ?");
        params.push(isFeatured ? 1 : 0);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const validSortColumns = [
        "created_at",
        "published_at",
        "views_count",
        "likes_count",
        "comments_count",
      ];
      const validSortOrders = ["ASC", "DESC"];

      const finalSortBy = validSortColumns.includes(sortBy)
        ? sortBy
        : "created_at";
      const finalSortOrder = validSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const sql = `
        SELECT p.*, 
               u.full_name as author_name,
               u.avatar as author_avatar,
               h.name as hospital_name
        FROM ${this.tableName} p
        LEFT JOIN users u ON p.author_id = u.id
        LEFT JOIN hospitals h ON p.hospital_id = h.id
        ${whereClause}
        ORDER BY p.${finalSortBy} ${finalSortOrder}
        LIMIT ${Number(limit)} OFFSET ${Number(offset)}
      `;

      // console.log("SQL Query:", sql);
      // console.log("Query params:", params);

      const [posts, [countResult]] = await Promise.all([
        this.query(sql, params),
        this.query(
          `
          SELECT COUNT(*) as total
          FROM ${this.tableName} p
          ${whereClause}
        `,
          params
        ),
      ]);

      // console.log("Query results:", { posts, countResult });

      return {
        posts: posts.map((post) => new PetPost(post)),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / Number(limit)),
        },
      };
    } catch (error) {
      console.error("Find all posts error:", error);
      throw error;
    }
  }

  // Get post detail
  static async getDetail(id, includeDeleted = false) {
    try {
      const sql = `
        SELECT p.*, 
               u.full_name as author_name,
               u.avatar as author_avatar,
               h.name as hospital_name
        FROM ${this.tableName} p
        LEFT JOIN users u ON p.author_id = u.id
        LEFT JOIN hospitals h ON p.hospital_id = h.id
        WHERE p.id = ? 
      `;

      const [post] = await this.query(sql, [id]);
      if (!post) return null;
      return new PetPost(post);
    } catch (error) {
      console.error("Get post detail error:", error);
      throw error;
    }
  }

  // Update interaction counts
  static async updateCounts(id) {
    try {
      const [[likesResult], [commentsResult]] = await Promise.all([
        this.query(
          "SELECT COUNT(*) as count FROM pet_post_likes WHERE post_id = ?",
          [id]
        ),
        this.query(
          "SELECT COUNT(*) as count FROM pet_post_comments WHERE post_id = ? AND is_deleted = 0",
          [id]
        ),
      ]);

      await this.update(id, {
        likes_count: likesResult.count,
        comments_count: commentsResult.count,
      });
    } catch (error) {
      console.error("Update counts error:", error);
      throw error;
    }
  }

  // Increment view count
  static async incrementViewCount(id) {
    try {
      await this.query(
        `UPDATE ${this.tableName} SET views_count = views_count + 1 WHERE id = ?`,
        [id]
      );
    } catch (error) {
      console.error("Increment view count error:", error);
      throw error;
    }
  }

  // Delete post and all related data
  static async delete(id) {
    try {
      // Delete all comments
      const PetPostComment = require("./PetPostComment");
      await PetPostComment.deleteAllByPostId(id);

      // Delete all likes
      await this.query(`DELETE FROM pet_post_likes WHERE post_id = ?`, [id]);

      // Delete post
      const sql = `
        DELETE FROM ${this.tableName}
        WHERE id = ?
      `;

      const result = await this.query(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Delete post error:", error);
      throw error;
    }
  }

  // Delete many posts
  static async deleteMany(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("Danh sách ID không hợp lệ");
      }

      // Delete all related data
      await Promise.all([
        this.query(`DELETE FROM pet_post_comments WHERE post_id IN (?)`, [ids]),
        this.query(`DELETE FROM pet_post_likes WHERE post_id IN (?)`, [ids]),
      ]);

      // Delete posts
      const sql = `
        DELETE FROM ${this.tableName}
        WHERE id IN (?)
      `;

      const result = await this.query(sql, [ids]);
      return result.affectedRows;
    } catch (error) {
      console.error("Delete many posts error:", error);
      throw error;
    }
  }

  // Check post ownership
  static async isOwnedByUser(postId, userId) {
    try {
      const [post] = await this.query(
        `SELECT author_id FROM ${this.tableName} WHERE id = ?`,
        [postId]
      );

      return post && post.author_id === userId;
    } catch (error) {
      console.error("Check post ownership error:", error);
      throw error;
    }
  }

  // Update post status
  static async updateStatus(id, status, publishedAt = null) {
    try {
      const validStatuses = ["DRAFT", "PENDING", "PUBLISHED", "ARCHIVED"];
      if (!validStatuses.includes(status)) {
        throw new Error("Trạng thái không hợp lệ");
      }

      const sql = `
        UPDATE ${this.tableName}
        SET status = ?, 
            published_at = ?
        WHERE id = ?
      `;

      await this.query(sql, [
        status,
        status === "PUBLISHED" ? publishedAt || new Date() : publishedAt,
        id,
      ]);

      return this.getDetail(id);
    } catch (error) {
      console.error("Update post status error:", error);
      throw error;
    }
  }

  // Update featured status
  static async toggleFeatured(id) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET is_featured = NOT is_featured
        WHERE id = ?
      `;

      await this.query(sql, [id]);
      return this.getDetail(id);
    } catch (error) {
      console.error("Toggle featured error:", error);
      throw error;
    }
  }

  // Search posts by title
  static async search(searchQuery, options = {}) {
    try {
      const { page = 1, limit = 10, status = "PUBLISHED" } = options;

      const offset = (page - 1) * limit;
      let conditions = ["p.is_deleted = 0"];
      let params = [];

      // Search by title
      if (searchQuery) {
        conditions.push("p.title LIKE ?");
        params.push(`%${searchQuery}%`);
      }

      // Filter by status
      if (status) {
        conditions.push("p.status = ?");
        params.push(status);
      }

      const sql = `
        SELECT 
          p.*,
          u.full_name as author_name,
          u.avatar as author_avatar,
          h.name as hospital_name
        FROM ${this.tableName} p
        LEFT JOIN users u ON p.author_id = u.id
        LEFT JOIN hospitals h ON p.hospital_id = h.id
        WHERE ${conditions.join(" AND ")}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName} p
        WHERE ${conditions.join(" AND ")}
      `;

      const [posts, [countResult]] = await Promise.all([
        this.query(sql, [...params, limit, offset]),
        this.query(countSql, params),
      ]);

      return {
        posts: posts.map((post) => new this(post)),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
        },
      };
    } catch (error) {
      console.error("Search posts error:", error);
      throw error;
    }
  }

  // Soft delete - only update status
  static async softDelete(id) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET is_deleted = 1, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await this.query(sql, [id]);
      return true;
    } catch (error) {
      console.error("Soft delete post error:", error);
      throw error;
    }
  }

  // Hard delete - delete post and all related data
  static async hardDelete(id) {
    try {
      // Delete likes
      await this.query(`DELETE FROM pet_post_likes WHERE post_id = ?`, [id]);

      // Delete reports of comments
      await this.query(
        `DELETE rr FROM report_reasons rr
         INNER JOIN pet_post_comments c ON rr.pet_post_comment_id = c.id
         WHERE c.post_id = ?`,
        [id]
      );

      // Delete comments
      await this.query(`DELETE FROM pet_post_comments WHERE post_id = ?`, [id]);

      // Delete post
      await this.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);

      return true;
    } catch (error) {
      console.error("Hard delete post error:", error);
      throw error;
    }
  }

  // Soft delete many posts
  static async softDeleteMany(ids) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET is_deleted = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id IN (?)
      `;

      await this.query(sql, [ids]);
      return true;
    } catch (error) {
      console.error("Soft delete many posts error:", error);
      throw error;
    }
  }

  // Hard delete many posts
  static async hardDeleteMany(ids) {
    try {
      // Delete likes
      await this.query(`DELETE FROM pet_post_likes WHERE post_id IN (?)`, [
        ids,
      ]);

      // Delete reports of comments
      await this.query(
        `DELETE rr FROM report_reasons rr
         INNER JOIN pet_post_comments c ON rr.pet_post_comment_id = c.id
         WHERE c.post_id IN (?)`,
        [ids]
      );

      // Delete comments
      await this.query(`DELETE FROM pet_post_comments WHERE post_id IN (?)`, [
        ids,
      ]);

      // Delete post
      await this.query(`DELETE FROM ${this.tableName} WHERE id IN (?)`, [ids]);

      return true;
    } catch (error) {
      console.error("Hard delete many posts error:", error);
      throw error;
    }
  }

  // Toggle soft delete status
  static async toggleSoftDelete(id) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET is_deleted = NOT is_deleted,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await this.query(sql, [id]);
      return true;
    } catch (error) {
      console.error("Toggle soft delete error:", error);
      throw error;
    }
  }

  // Get all blogs without filter
  static async getAllBlogs() {
    try {
      const sql = `
        SELECT 
          p.*,
          u.full_name as author_name,
          u.avatar as author_avatar,
          h.name as hospital_name,
          CAST(p.is_deleted AS UNSIGNED) as is_deleted,
          CAST(p.is_featured AS UNSIGNED) as is_featured
        FROM ${this.tableName} p
        LEFT JOIN users u ON p.author_id = u.id 
        LEFT JOIN hospitals h ON p.hospital_id = h.id
        WHERE p.post_type = 'BLOG'
        AND p.is_deleted = 0
        ORDER BY p.created_at DESC
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        WHERE post_type = 'BLOG' 
        AND is_deleted = 0
      `;

      const [posts, [countResult]] = await Promise.all([
        this.query(sql),
        this.query(countSql)
      ]);

      return {
        posts: posts.map(post => new PetPost(post)),
        pagination: {
          page: 1,
          limit: posts.length,
          total: countResult.total,
          totalPages: 1
        }
      };
    } catch (error) {
      console.error("Get all blogs error:", error);
      throw error;
    }
  }

  // Get soft deleted blogs
  static async getSoftDeletedBlogs() {
    try {
      const sql = `
        SELECT 
          p.*,
          u.full_name as author_name,
          u.avatar as author_avatar,
          h.name as hospital_name,
          CAST(p.is_deleted AS UNSIGNED) as is_deleted,
          CAST(p.is_featured AS UNSIGNED) as is_featured
        FROM ${this.tableName} p
        LEFT JOIN users u ON p.author_id = u.id 
        LEFT JOIN hospitals h ON p.hospital_id = h.id
        WHERE p.post_type = 'BLOG'
        AND p.is_deleted = 1
        ORDER BY p.updated_at DESC
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        WHERE post_type = 'BLOG' 
        AND is_deleted = 1
      `;

      const [posts, [countResult]] = await Promise.all([
        this.query(sql),
        this.query(countSql)
      ]);

      return {
        posts: posts.map(post => new PetPost(post)),
        pagination: {
          page: 1,
          limit: posts.length,
          total: countResult.total,
          totalPages: 1
        }
      };
    } catch (error) {
      console.error("Get soft deleted blogs error:", error);
      throw error;
    }
  }
}

module.exports = PetPost;
