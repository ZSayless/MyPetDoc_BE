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

      // // Log để debug
      // console.log("Getting favorites for user:", userId);
      // console.log("Page:", page, "Limit:", limit, "Offset:", offset);

      const sql = `
        SELECT 
          h.id,
          h.name,
          h.address,
          h.phone,
          h.email,
          h.description,
          h.operating_hours,
          h.specialties,
          h.is_active,
          f.created_at as favorited_at,
          (SELECT hi.image_url 
           FROM hospital_images hi 
           WHERE hi.hospital_id = h.id 
           LIMIT 1) as thumbnail
        FROM ${this.tableName} f
        JOIN hospitals h ON f.hospital_id = h.id
        WHERE f.user_id = ? 
        AND f.is_deleted = 0
        AND h.is_deleted = 0
        ORDER BY f.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName} f
        JOIN hospitals h ON f.hospital_id = h.id
        WHERE f.user_id = ? 
        AND f.is_deleted = 0
        AND h.is_deleted = 0
      `;

      // // Log câu query để debug
      // console.log("SQL Query:", sql);
      // console.log("Count SQL Query:", countSql);
      // console.log("Parameters:", [userId]);

      const [favorites, [countResult]] = await Promise.all([
        this.query(sql, [userId]),
        this.query(countSql, [userId]),
      ]);

      // // Log kết quả để debug
      // console.log("Found favorites:", favorites);
      // console.log("Count result:", countResult);

      // Convert bit to boolean for is_active
      const formattedFavorites = favorites.map((hospital) => ({
        ...hospital,
        is_active: hospital.is_active === 1,
      }));

      return {
        favorites: formattedFavorites,
        pagination: {
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
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName} f
        JOIN users u ON f.user_id = u.id
        WHERE f.hospital_id = ? 
        AND f.is_deleted = 0
        AND u.is_deleted = 0
      `;

      // // Log để debug
      // console.log("SQL Query:", sql);
      // console.log("Count SQL Query:", countSql);
      // console.log("Parameters:", [hospitalId]);

      const [users, [countResult]] = await Promise.all([
        this.query(sql, [hospitalId]),
        this.query(countSql, [hospitalId]),
      ]);

      // Log kết quả
      // console.log("Found users:", users);
      // console.log("Count result:", countResult);

      return {
        users,
        pagination: {
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

  // Lấy số lượng favorite của một user
  static async countUserFavorites(userId) {
    try {
      const sql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName} f
        JOIN hospitals h ON f.hospital_id = h.id
        WHERE f.user_id = ? 
        AND f.is_deleted = 0
        AND h.is_deleted = 0
      `;

      const [result] = await this.query(sql, [userId]);
      return result.total;
    } catch (error) {
      console.error("Count user favorites error:", error);
      throw error;
    }
  }

  // Lấy danh sách favorite mới nhất
  static async getLatestFavorites(limit = 10) {
    try {
      const sql = `
        SELECT 
          h.name as hospital_name,
          u.full_name as user_name,
          f.created_at as favorited_at
        FROM ${this.tableName} f
        JOIN hospitals h ON f.hospital_id = h.id
        JOIN users u ON f.user_id = u.id
        WHERE f.is_deleted = 0
        AND h.is_deleted = 0
        AND u.is_deleted = 0
        ORDER BY f.created_at DESC
        LIMIT ${limit}
      `;

      return await this.query(sql, [limit]);
    } catch (error) {
      console.error("Get latest favorites error:", error);
      throw error;
    }
  }
}

module.exports = Favorite;
