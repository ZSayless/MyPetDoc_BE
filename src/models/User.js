const BaseModel = require("./BaseModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const convertBitToBoolean = require("../utils/convertBitToBoolean");

class User extends BaseModel {
  static tableName = "users";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }

  generateAuthToken() {
    return jwt.sign(
      {
        id: this.id,
        role: this.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h",
      }
    );
  }

  static async findOne(conditions) {
    const userData = await super.findOne(conditions);
    if (!userData) return null;
    return new User(userData);
  }

  static async create(data) {
    try {
      const userData = await super.create(data);
      return new User(userData);
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  static async update(id, data) {
    const userData = await super.update(id, data);
    return new User(userData);
  }

  static async hardDelete(id) {
    await super.hardDelete(id);
  }

  static async softDelete(id) {
    await super.softDelete(id);
  }

  static async findByEmail(email) {
    const userData = await this.findOne({ email });
    if (!userData) return null;

    userData.is_locked = convertBitToBoolean(userData.is_locked);
    userData.is_active = convertBitToBoolean(userData.is_active);

    return new User(userData);
  }

  static async findById(id) {
    const userData = await super.findById(id);

    if (!userData) {
      return null;
    }

    // Convert bit fields to boolean
    const user = new User({
      ...userData,
      is_active: convertBitToBoolean(userData.is_active),
      is_locked: convertBitToBoolean(userData.is_locked),
      is_deleted: convertBitToBoolean(userData.is_deleted),
    });

    return user;
  }

  static async isEmailTaken(email, excludeUserId) {
    try {
      const sql = excludeUserId
        ? `SELECT COUNT(*) as count FROM ${this.tableName} WHERE email = ? AND id != ?`
        : `SELECT COUNT(*) as count FROM ${this.tableName} WHERE email = ?`;

      const params = excludeUserId ? [email, excludeUserId] : [email];
      const rows = await this.query(sql, params);

      return rows[0]?.count > 0;
    } catch (error) {
      console.error("IsEmailTaken error:", error);
      throw error;
    }
  }

  static async findAll(filters = {}, options = {}) {
    const users = await super.findAll(filters, options);

    // Convert bit fields to boolean for each user
    return users.map(
      (userData) =>
        new User({
          ...userData,
          is_active: convertBitToBoolean(userData.is_active),
          is_locked: convertBitToBoolean(userData.is_locked),
          is_deleted: convertBitToBoolean(userData.is_deleted),
        })
    );
  }

  async isPasswordMatch(password) {
    return await bcrypt.compare(password, this.password);
  }

  static async findByHospitalId(hospitalId) {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE hospital_id = ? AND is_deleted = 0
      `;
      const users = await this.query(sql, [hospitalId]);

      // Convert bit fields to boolean for each user
      return users.map(
        (userData) =>
          new User({
            ...userData,
            is_active: convertBitToBoolean(userData.is_active),
            is_locked: convertBitToBoolean(userData.is_locked),
            is_deleted: convertBitToBoolean(userData.is_deleted),
          })
      );
    } catch (error) {
      console.error("FindByHospitalId error:", error);
      throw error;
    }
  }

  static async deleteUserRelations(userId) {
    const queries = [
      // 1. Xóa comments và likes trong pet gallery
      "UPDATE pet_gallery SET user_id = NULL WHERE user_id = ?",
      "DELETE FROM pet_gallery_comments WHERE user_id = ?",
      "DELETE FROM pet_gallery_likes WHERE user_id = ?",

      // 2. Xóa comments và likes trong pet post
      "UPDATE pet_posts SET author_id = NULL WHERE author_id = ?",
      "DELETE FROM pet_post_comments WHERE user_id = ?",
      "DELETE FROM pet_post_likes WHERE user_id = ?",

      // 3. Xóa tất cả report_reasons của reviews mà user đã viết
      `DELETE rr FROM report_reasons rr 
       INNER JOIN reviews r ON rr.review_id = r.id 
       WHERE r.user_id = ?`,
      "DELETE FROM report_reasons WHERE reported_by = ?",

      // 4. Xóa reviews của user
      "DELETE FROM reviews WHERE user_id = ?",

      // 5. Xóa favorites của user
      "DELETE FROM favorites WHERE user_id = ?",

      // 6. Cập nhật contact message
      "UPDATE contact_messages SET user_id = NULL WHERE user_id = ?",

      // 7. Cập nhật các bảng tham chiếu có created_by/last_updated_by
      "UPDATE banners SET created_by = NULL WHERE created_by = ?",
      "UPDATE about_us SET last_updated_by = NULL WHERE last_updated_by = ?",
      "UPDATE privacy_policy SET last_updated_by = NULL WHERE last_updated_by = ?",
      "UPDATE terms_conditions SET last_updated_by = NULL WHERE last_updated_by = ?",
      "UPDATE contact_information SET last_updated_by = NULL WHERE last_updated_by = ?",
      "UPDATE hospital_images SET created_by = NULL WHERE created_by = ?",
      "UPDATE hospitals SET created_by = NULL WHERE created_by = ?",
    ];

    // Log để debug
    console.log("Deleting relations for user:", userId);

    // Thực thi các câu query theo thứ tự
    for (const sql of queries) {
      try {
        console.log("Executing query:", sql);
        await this.query(sql, [userId]);
      } catch (error) {
        console.error(`Error executing query: ${sql}`, error);
        console.error("Error details:", error.message);
        throw error;
      }
    }
  }

  // Thêm phương thức để kiểm tra cấu trúc bảng
  static async checkTableStructure(tableName) {
    try {
      const [columns] = await this.query(`DESCRIBE ${tableName}`);
      console.log(`Structure of ${tableName}:`, columns);
      return columns;
    } catch (error) {
      console.error(`Error checking table structure for ${tableName}:`, error);
      throw error;
    }
  }

  static async countAdmins() {
    const sql = `
      SELECT COUNT(*) as total 
      FROM ${this.tableName} 
      WHERE role = 'ADMIN' 
      AND is_deleted = 0
      AND is_active = 1
    `;
    const [result] = await this.query(sql);
    return result.total;
  }

  static async checkUserRelations(userId) {
    const queries = {
      reviews: "SELECT COUNT(*) as count FROM reviews WHERE user_id = ?",
      favorites: "SELECT COUNT(*) as count FROM favorites WHERE user_id = ?",
      contact_messages:
        "SELECT COUNT(*) as count FROM contact_messages WHERE user_id = ?",
      hospitals: "SELECT COUNT(*) as count FROM hospitals WHERE created_by = ?",
      banners: "SELECT COUNT(*) as count FROM banners WHERE created_by = ?",
      hospital_images:
        "SELECT COUNT(*) as count FROM hospital_images WHERE created_by = ?",
      petgallerys: "SELECT COUNT(*) as count FROM petgallery WHERE user_id = ?",
      reports_reasons:
        "SELECT COUNT(*) as count FROM report_reasons rr INNER JOIN reviews r ON rr.review_id = r.id WHERE r.user_id = ?",
      pet_gallery_comments:
        "SELECT COUNT(*) as count FROM pet_gallery_comments WHERE user_id = ?",
      pet_gallery_likes:
        "SELECT COUNT(*) as count FROM pet_gallery_likes WHERE user_id = ?",
      pet_post_comments:
        "SELECT COUNT(*) as count FROM pet_post_comments WHERE user_id = ?",
      pet_post_likes:
        "SELECT COUNT(*) as count FROM pet_post_likes WHERE user_id = ?",
      pet_gallery:
        "SELECT COUNT(*) as count FROM pet_gallery WHERE user_id = ?",
      pet_post: "SELECT COUNT(*) as count FROM pet_posts WHERE author_id = ?",
      report_by: "SELECT COUNT(*) as count FROM report_reasons WHERE reported_by = ?",
    };

    const results = {};
    for (const [table, sql] of Object.entries(queries)) {
      try {
        const [result] = await this.query(sql, [userId]);
        results[table] = result.count;
      } catch (error) {
        console.error(`Error checking relations for ${table}:`, error);
        results[table] = 0;
      }
    }

    console.log("User relations check results:", results);
    return results;
  }
}

module.exports = User;
