const BaseModel = require("./BaseModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const convertBitToBoolean = require("../utils/convertBitToBoolean");
const cloudinary = require("../config/cloudinary");

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
        email: this.email,
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
      // 1. Delete comments and likes in pet gallery
      "UPDATE pet_gallery SET user_id = NULL WHERE user_id = ?",
      "DELETE FROM pet_gallery_comments WHERE user_id = ?",
      "DELETE FROM pet_gallery_likes WHERE user_id = ?",

      // 2. Delete comments and likes in pet post
      "UPDATE pet_posts SET author_id = NULL WHERE author_id = ?",
      "DELETE FROM pet_post_comments WHERE user_id = ?",
      "DELETE FROM pet_post_likes WHERE user_id = ?",

      // 3. Delete all report_reasons of reviews that user wrote
      `DELETE rr FROM report_reasons rr 
       INNER JOIN reviews r ON rr.review_id = r.id 
       WHERE r.user_id = ?`,
      "DELETE FROM report_reasons WHERE reported_by = ?",

      // 4. Delete favorites of user
      "DELETE FROM favorites WHERE user_id = ?",

      // 5. Update contact message
      "UPDATE contact_messages SET user_id = NULL WHERE user_id = ?",

      // 6. Update tables with created_by/last_updated_by
      "UPDATE banners SET created_by = NULL WHERE created_by = ?",
      "UPDATE about_us SET last_updated_by = NULL WHERE last_updated_by = ?",
      "UPDATE privacy_policy SET last_updated_by = NULL WHERE last_updated_by = ?",
      "UPDATE terms_conditions SET last_updated_by = NULL WHERE last_updated_by = ?",
      "UPDATE contact_information SET last_updated_by = NULL WHERE last_updated_by = ?",
      "UPDATE hospital_images SET created_by = NULL WHERE created_by = ?",
      "UPDATE hospitals SET created_by = NULL WHERE created_by = ?",
    ];

    // Log for debug
    // console.log("Deleting relations for user:", userId);

    try {
      // First execute other queries in order
      for (const sql of queries) {
        // console.log("Executing query:", sql);
        await this.query(sql, [userId]);
      }
      // Handle reviews deletion with special method
      await this.hardDeleteReview(userId);
    } catch (error) {
      console.error("Error in deleteUserRelations:", error);
      throw error;
    }
  }

  // Hard delete user reviews
  static async hardDeleteReview(userId) {
    try {
      // Get all reviews of user
      const sql = `SELECT * FROM reviews WHERE user_id = ?`;
      const reviews = await this.query(sql, [userId]);

      // Delete images from Cloudinary if exists
      for (const review of reviews) {
        if (review.image_url) {
          try {
            const urlParts = review.image_url.split("/");
            const filename = urlParts[urlParts.length - 1].split(".")[0];
            const publicId = `reviews/${filename}`;

            await cloudinary.uploader.destroy(publicId);
            // console.log(`Deleted image for review ${review.id}: ${publicId}`);
          } catch (cloudinaryError) {
            console.error(
              `Error deleting image for review ${review.id}:`,
              cloudinaryError
            );
          }
        }
      }

      // Delete related reports for all reviews
      const reviewIds = reviews.map((review) => review.id);
      if (reviewIds.length > 0) {
        // Sửa lại cách xử lý IN clause
        const placeholders = reviewIds.map(() => "?").join(",");
        await this.query(
          `DELETE FROM report_reasons WHERE review_id IN (${placeholders})`,
          reviewIds
        );
      }

      // Delete all reviews of user
      await this.query(`DELETE FROM reviews WHERE user_id = ?`, [userId]);

      return {
        status: "success",
        message: `Successfully deleted ${reviews.length} reviews for user ${userId}`,
        deletedReviews: reviews.length,
      };
    } catch (error) {
      console.error("Error in User.hardDeleteReview:", error);
      throw error;
    }
  }

  // Add method to check table structure
  static async checkTableStructure(tableName) {
    try {
      const [columns] = await this.query(`DESCRIBE ${tableName}`);
      // console.log(`Structure of ${tableName}:`, columns);
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
      report_by:
        "SELECT COUNT(*) as count FROM report_reasons WHERE reported_by = ?",
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

    // console.log("User relations check results:", results);
    return results;
  }
}

module.exports = User;
