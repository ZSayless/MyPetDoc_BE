const BaseModel = require("./BaseModel");

class PetGalleryLike extends BaseModel {
  static tableName = "pet_gallery_likes";

  // Check if user has liked post
  static async hasUserLiked(userId, galleryId) {
    try {
      // Check input parameters
      if (!userId || !galleryId) {
        throw new Error("userId and galleryId is required");
      }

      const sql = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE user_id = ? AND gallery_id = ?
      `;

      // Convert to number
      const params = [Number(userId), Number(galleryId)];
      const [result] = await this.query(sql, params);
      return result.count > 0;
    } catch (error) {
      console.error("Check user like error:", error);
      console.error("Parameters:", { userId, galleryId });
      throw error;
    }
  }

  // Toggle like
  static async toggleLike(userId, galleryId) {
    try {
      // Check input parameters
      if (!userId || !galleryId) {
        throw new Error("userId and galleryId is required");
      }

      // Convert to number
      userId = Number(userId);
      galleryId = Number(galleryId);

      const hasLiked = await this.hasUserLiked(userId, galleryId);

      if (hasLiked) {
        await this.query(
          `DELETE FROM ${this.tableName} WHERE user_id = ? AND gallery_id = ?`,
          [userId, galleryId]
        );
      } else {
        await this.query(
          `INSERT INTO ${this.tableName} (user_id, gallery_id) VALUES (?, ?)`,
          [userId, galleryId]
        );
      }

      // Update like count in pet_gallery table
      const PetGallery = require("./PetGallery");
      await PetGallery.updateCounts(galleryId);

      return !hasLiked;
    } catch (error) {
      console.error("Toggle like error:", error);
      console.error("Parameters:", { userId, galleryId });
      throw error;
    }
  }

  // Delete like of post
  static async delete(galleryId) {
    await this.query(`DELETE FROM ${this.tableName} WHERE gallery_id = ?`, [
      galleryId,
    ]);
  }

  // Get list of users who liked post
  static async getLikedUsers(galleryId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;

      const offset = (page - 1) * limit;

      const sql = `
        SELECT u.id, u.full_name, u.avatar, l.created_at as liked_at
        FROM ${this.tableName} l
        JOIN users u ON l.user_id = u.id
        WHERE l.gallery_id = ?
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        WHERE gallery_id = ?
      `;

      const [users, [countResult]] = await Promise.all([
        this.query(sql, [galleryId, limit, offset]),
        this.query(countSql, [galleryId]),
      ]);

      return {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
        },
      };
    } catch (error) {
      console.error("Get liked users error:", error);
      throw error;
    }
  }
}

module.exports = PetGalleryLike;
