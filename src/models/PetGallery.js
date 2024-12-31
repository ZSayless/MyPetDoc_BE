const BaseModel = require("./BaseModel");
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

  // Lấy danh sách bài đăng có phân trang và filter
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

      // Thêm điều kiện is_deleted
      if (!includeDeleted) {
        conditions.push("g.is_deleted = ?");
        params.push(0);
      }

      // Filter theo pet_type
      if (petType) {
        conditions.push("g.pet_type = ?");
        params.push(petType);
      }

      // Filter theo user_id
      if (userId) {
        conditions.push("g.user_id = ?");
        params.push(Number(userId));
      }

      // Filter theo tags
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

      // Query chính - sử dụng interpolation cho LIMIT và OFFSET
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

      // Query đếm tổng số bản ghi
      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName} g
        ${whereClause}
      `;

      console.log("SQL Query:", sql);
      console.log("Parameters:", params);

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

  // Tạo bài đăng mới
  static async create(data) {
    try {
      const postData = await super.create({
        ...data,
        likes_count: 0,
        comments_count: 0,
      });
      return new PetGallery(postData);
    } catch (error) {
      console.error("Create pet gallery post error:", error);
      throw error;
    }
  }

  // Cập nhật số lượng like và comment
  static async updateCounts(id) {
    try {
      const [[likesResult], [commentsResult]] = await Promise.all([
        this.query(
          "SELECT COUNT(*) as count FROM pet_gallery_likes WHERE gallery_id = ?",
          [id]
        ),
        this.query(
          "SELECT COUNT(*) as count FROM pet_gallery_comments WHERE gallery_id = ?",
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

  // Lấy chi tiết bài đăng kèm thông tin user
  static async getDetail(id) {
    try {
      const sql = `
        SELECT g.*, 
               u.full_name as user_name,
               u.avatar as user_avatar,
               (SELECT COUNT(*) FROM pet_gallery_likes WHERE gallery_id = g.id) as likes_count,
               (SELECT COUNT(*) FROM pet_gallery_comments WHERE gallery_id = g.id AND is_deleted = 0) as comments_count
        FROM ${this.tableName} g
        LEFT JOIN users u ON g.user_id = u.id
        WHERE g.id = ?
      `;

      const [post] = await this.query(sql, [id]);
      if (!post) return null;
      return new PetGallery(post);
    } catch (error) {
      console.error("Get post detail error:", error);
      throw error;
    }
  }

  // Cập nhật bài đăng
  static async update(id, data) {
    try {
      const updateData = { ...data };
      delete updateData.id; // Đảm bảo không update id

      // Lọc bỏ các trường undefined/null
      const filteredData = Object.fromEntries(
        Object.entries(updateData).filter(
          ([_, value]) => value !== undefined && value !== null
        )
      );

      if (Object.keys(filteredData).length === 0) {
        throw new Error("Không có dữ liệu để cập nhật");
      }

      // Tạo câu SET động từ các trường có giá trị
      const setFields = Object.keys(filteredData)
        .map((key) => `${key} = ?`)
        .join(", ");

      const sql = `
        UPDATE ${this.tableName}
        SET ${setFields}
        WHERE id = ?
      `;

      // Tạo mảng params chỉ từ các trường có giá trị
      const params = [...Object.values(filteredData), id];

      console.log("Update SQL:", sql);
      console.log("Update params:", params);

      await this.query(sql, params);
      return this.getDetail(id);
    } catch (error) {
      console.error("Update post error:", error);
      throw error;
    }
  }

  // Soft delete bài đăng
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

  // Hard delete bài đăng
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
}

module.exports = PetGallery;
