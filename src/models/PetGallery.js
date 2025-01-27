const BaseModel = require("./BaseModel");
const slugify = require("../utils/slugify");
const convertBitToBoolean = require("../utils/convertBitToBoolean");

class PetGallery extends BaseModel {
  static tableName = "pet_gallery";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        is_deleted: convertBitToBoolean(data.is_deleted),
      });
    }
  }

  // Get list of posts with pagination and filter
  static async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        petType,
        tags,
        userId,
        sortBy = "created_at",
        sortOrder = "DESC",
        includeDeleted = false,
      } = options;

      const offset = (page - 1) * limit;
      let conditions = [];
      let params = [];

      // Add is_deleted condition
      if (!includeDeleted) {
        conditions.push("g.is_deleted = ?");
        params.push(0);
      }

      // Filter by pet_type
      if (petType) {
        conditions.push("g.pet_type = ?");
        params.push(petType);
      }

      // Filter by user_id
      if (userId) {
        conditions.push("g.user_id = ?");
        params.push(Number(userId));
      }

      // Filter by tags
      if (tags) {
        conditions.push("g.tags LIKE ?");
        params.push(`%${tags}%`);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // Validate sort parameters
      const validSortColumns = ["created_at", "likes_count", "comments_count"];
      const validSortOrders = ["ASC", "DESC"];

      const finalSortBy = validSortColumns.includes(sortBy)
        ? sortBy
        : "created_at";
      const finalSortOrder = validSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      // Main query - use interpolation for LIMIT and OFFSET
      const sql = `
        SELECT g.*, 
               u.full_name as user_name,
               u.avatar as user_avatar,
               (SELECT COUNT(*) FROM pet_gallery_likes WHERE gallery_id = g.id) as likes_count,
               (SELECT COUNT(*) FROM pet_gallery_comments WHERE gallery_id = g.id AND is_deleted = 0) as comments_count
        FROM ${this.tableName} g
        LEFT JOIN users u ON g.user_id = u.id
        ${whereClause}
        ORDER BY g.${finalSortBy} ${finalSortOrder}
        LIMIT ${Number(limit)} OFFSET ${Number(offset)}
      `;

      // Query to count total records
      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName} g
        ${whereClause}
      `;

      // console.log("SQL Query:", sql);
      // console.log("Parameters:", params);

      const [posts, [countResult]] = await Promise.all([
        this.query(sql, params),
        this.query(countSql, params),
      ]);

      return {
        posts: posts.map((post) => new PetGallery(post)),
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

  // Create new post
  static async create(data) {
    try {
      const postData = await super.create({
        ...data,
        slug: slugify(data.caption),
        likes_count: 0,
        comments_count: 0,
      });
      return new PetGallery(postData);
    } catch (error) {
      console.error("Create pet gallery post error:", error);
      throw error;
    }
  }

  // Update like and comment counts
  static async updateCounts(id) {
    try {
      if (!id) {
        throw new Error("ID is required");
      }

      const [[likesResult], [commentsResult]] = await Promise.all([
        this.query(
          "SELECT COUNT(*) as count FROM pet_gallery_likes WHERE gallery_id = ?",
          [Number(id)]
        ),
        this.query(
          "SELECT COUNT(*) as count FROM pet_gallery_comments WHERE gallery_id = ? AND is_deleted = 0",
          [Number(id)]
        ),
      ]);

      // Đảm bảo các giá trị không undefined
      const updateData = {
        likes_count: likesResult.count || 0,
        comments_count: commentsResult.count || 0
      };

      // Log để debug
      console.log("Update counts data:", {
        id,
        updateData,
        likesResult,
        commentsResult
      });

      const sql = `
        UPDATE ${this.tableName}
        SET likes_count = ?, comments_count = ?
        WHERE id = ?
      `;

      const params = [updateData.likes_count, updateData.comments_count, Number(id)];
      
      // Log câu query và tham số
      console.log("Update SQL:", sql);
      console.log("Update params:", params);

      await this.query(sql, params);

      return true;
    } catch (error) {
      console.error("Update counts error:", error);
      console.error("Update counts params:", { id });
      throw error;
    }
  }

  static async getDetail(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const [post] = await this.query(sql, [id]);
    return post ? new PetGallery(post) : null;
  }

  // Get post detail with user information by slug
  static async getDetailBySlug(slug) {
    try {
      if (!slug) {
        throw new Error("Slug is required");
      }

      const sql = `
        SELECT g.*, 
               u.full_name as user_name,
               u.avatar as user_avatar,
               g.slug,
               (SELECT COUNT(*) FROM pet_gallery_likes WHERE gallery_id = g.id) as likes_count,
               (SELECT COUNT(*) FROM pet_gallery_comments WHERE gallery_id = g.id AND is_deleted = 0) as comments_count
        FROM ${this.tableName} g
        LEFT JOIN users u ON g.user_id = u.id
        WHERE g.slug = ?
      `;

      const [post] = await this.query(sql, [slug]);
      if (!post) return null;
      return new PetGallery(post);
    } catch (error) {
      console.error("Get post detail by slug error:", error);
      throw error;
    }
  }

  // Update post
  static async update(id, data) {
    try {
      if (!id) {
        throw new Error("ID is required");
      }

      // Đảm bảo data không undefined
      const updateData = { ...data };
      
      // Lọc bỏ các giá trị undefined/null
      const filteredData = Object.fromEntries(
        Object.entries(updateData).filter(
          ([_, value]) => value !== undefined && value !== null
        )
      );

      if (Object.keys(filteredData).length === 0) {
        throw new Error("No data to update");
      }

      // Tạo câu SQL động
      const setFields = Object.keys(filteredData)
        .map((key) => `${key} = ?`)
        .join(", ");

      const sql = `
        UPDATE ${this.tableName}
        SET ${setFields}
        WHERE id = ?
      `;

      const params = [...Object.values(filteredData), Number(id)];

      // Log để debug
      console.log("Update SQL:", sql);
      console.log("Update params:", params);

      const result = await this.query(sql, params);

      if (result.affectedRows === 0) {
        return null;
      }

      return await this.getDetail(id);
    } catch (error) {
      console.error("Update post error:", error);
      console.error("Update params:", { id, data });
      throw error;
    }
  }

  // Soft delete post
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
      console.error("Soft delete post error:", error);
      throw error;
    }
  }

  // Hard delete post
  static async hardDelete(id) {
    try {
      const sql = `
        DELETE FROM ${this.tableName}
        WHERE id = ?
      `;

      const result = await this.query(sql, [id]);

      if (result.affectedRows === 0) {
        throw new Error("Không thể xóa bài đăng");
      }

      return true;
    } catch (error) {
      console.error("Hard delete post error:", error);
      throw error;
    }
  }

  static async delete(galleryId) {
    try {
      // 1. Get all comments (including replies)
      const comments = await this.query(
        `SELECT id FROM pet_gallery_comments 
         WHERE gallery_id = ? OR parent_id IN 
         (SELECT id FROM pet_gallery_comments WHERE gallery_id = ?)`,
        [galleryId, galleryId]
      );

      const commentIds = comments.map((comment) => comment.id);

      if (commentIds.length > 0) {
        // 2. Delete all report_reasons related to comments
        const reportReasonsSql = `DELETE FROM report_reasons WHERE pet_gallery_comment_id IN (${commentIds.join(
          ","
        )})`;
        await this.query(reportReasonsSql);

        // 3. Delete all replies before
        await this.query(
          `DELETE FROM pet_gallery_comments WHERE parent_id IN 
           (SELECT id FROM (
             SELECT id FROM pet_gallery_comments WHERE gallery_id = ?
           ) AS tmp)`,
          [galleryId]
        );

        // 4. Delete all root comments
        await this.query(
          `DELETE FROM pet_gallery_comments WHERE gallery_id = ?`,
          [galleryId]
        );
      }

      // 5. Delete likes of gallery
      await this.query(`DELETE FROM pet_gallery_likes WHERE gallery_id = ?`, [
        galleryId,
      ]);

      // 6. Delete gallery
      await this.query(`DELETE FROM pet_gallery WHERE id = ?`, [galleryId]);

      return true;
    } catch (error) {
      console.error("Delete gallery error:", error);
      throw error;
    }
  }
}

module.exports = PetGallery;
