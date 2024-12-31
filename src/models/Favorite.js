const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");

class Favorite extends BaseModel {
  static tableName = "favorites";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        is_deleted: convertBitToBoolean(data.is_deleted),
      });
    }
  }

  // Kiểm tra user đã favorite bệnh viện chưa
  static async hasUserFavorited(userId, hospitalId) {
    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE user_id = ? AND hospital_id = ? AND is_deleted = 0
      `;

      const [result] = await this.query(sql, [userId, hospitalId]);
      return result.count > 0;
    } catch (error) {
      console.error("Check user favorite error:", error);
      throw error;
    }
  }

  // Toggle favorite
  static async toggleFavorite(userId, hospitalId) {
    try {
      const hasFavorited = await this.hasUserFavorited(userId, hospitalId);

      if (hasFavorited) {
        // Soft delete favorite
        await this.query(
          `UPDATE ${this.tableName} 
           SET is_deleted = 1 
           WHERE user_id = ? AND hospital_id = ?`,
          [userId, hospitalId]
        );
      } else {
        // Kiểm tra xem đã có bản ghi bị soft delete chưa
        const [existingRecord] = await this.query(
          `SELECT id FROM ${this.tableName} 
           WHERE user_id = ? AND hospital_id = ?`,
          [userId, hospitalId]
        );

        if (existingRecord) {
          // Nếu có thì restore
          await this.query(
            `UPDATE ${this.tableName} 
             SET is_deleted = 0 
             WHERE user_id = ? AND hospital_id = ?`,
            [userId, hospitalId]
          );
        } else {
          // Nếu chưa có thì tạo mới
          await this.query(
            `INSERT INTO ${this.tableName} (user_id, hospital_id) 
             VALUES (?, ?)`,
            [userId, hospitalId]
          );
        }
      }

      return !hasFavorited;
    } catch (error) {
      console.error("Toggle favorite error:", error);
      throw error;
    }
  }

  // Lấy danh sách bệnh viện yêu thích của user
  static async getUserFavorites(userId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const sql = `
        SELECT 
          h.*,
          f.created_at as favorited_at,
          (SELECT image_url 
           FROM hospital_images 
           WHERE hospital_id = h.id 
           LIMIT 1) as thumbnail
        FROM ${this.tableName} f
        JOIN hospitals h ON f.hospital_id = h.id
        WHERE f.user_id = ? 
        AND f.is_deleted = 0
        AND h.is_deleted = 0
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName} f
        JOIN hospitals h ON f.hospital_id = h.id
        WHERE f.user_id = ? 
        AND f.is_deleted = 0
        AND h.is_deleted = 0
      `;

      const [favorites, [countResult]] = await Promise.all([
        this.query(sql, [userId, limit, offset]),
        this.query(countSql, [userId]),
      ]);

      return {
        favorites,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
        },
      };
    } catch (error) {
      console.error("Get user favorites error:", error);
      throw error;
    }
  }

  // Lấy danh sách user đã favorite một bệnh viện
  static async getHospitalFavorites(hospitalId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const sql = `
        SELECT 
          u.id,
          u.full_name,
          u.avatar,
          f.created_at as favorited_at
        FROM ${this.tableName} f
        JOIN users u ON f.user_id = u.id
        WHERE f.hospital_id = ? 
        AND f.is_deleted = 0
        AND u.is_deleted = 0
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName} f
        JOIN users u ON f.user_id = u.id
        WHERE f.hospital_id = ? 
        AND f.is_deleted = 0
        AND u.is_deleted = 0
      `;

      const [users, [countResult]] = await Promise.all([
        this.query(sql, [hospitalId, limit, offset]),
        this.query(countSql, [hospitalId]),
      ]);

      return {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
        },
      };
    } catch (error) {
      console.error("Get hospital favorites error:", error);
      throw error;
    }
  }

  // Đếm số lượng favorite của một bệnh viện
  static async countHospitalFavorites(hospitalId) {
    try {
      const sql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        WHERE hospital_id = ? AND is_deleted = 0
      `;

      const [result] = await this.query(sql, [hospitalId]);
      return result.total;
    } catch (error) {
      console.error("Count hospital favorites error:", error);
      throw error;
    }
  }
}

module.exports = Favorite;
