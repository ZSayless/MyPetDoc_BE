const BaseModel = require("./BaseModel");

class PetPostLike extends BaseModel {
  static tableName = "pet_post_likes";

  static async hasUserLiked(userId, postId) {
    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE user_id = ? AND post_id = ?
      `;

      const [result] = await this.query(sql, [userId, postId]);
      return result.count > 0;
    } catch (error) {
      console.error("Check user like error:", error);
      throw error;
    }
  }

  static async toggleLike(userId, postId) {
    try {
      const hasLiked = await this.hasUserLiked(userId, postId);

      if (hasLiked) {
        await this.query(
          `DELETE FROM ${this.tableName} WHERE user_id = ? AND post_id = ?`,
          [userId, postId]
        );
      } else {
        await this.query(
          `INSERT INTO ${this.tableName} (user_id, post_id) VALUES (?, ?)`,
          [userId, postId]
        );
      }

      // Update likes count in pet_posts table
      const PetPost = require("./PetPost");
      await PetPost.updateCounts(postId);

      return !hasLiked;
    } catch (error) {
      console.error("Toggle like error:", error);
      throw error;
    }
  }

  // Get list of users who liked post
  static async getLikedUsers(postId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const sql = `
        SELECT u.id, u.full_name, u.avatar, l.created_at AS liked_at
        FROM ${this.tableName} l
        JOIN users u ON l.user_id = u.id
        WHERE l.post_id = ${postId}
        ORDER BY l.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        WHERE post_id = ?
      `;

      const [users, [countResult]] = await Promise.all([
        this.query(sql, [postId, limit, offset]),
        this.query(countSql, [postId]),
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

  // Add new method to count likes
  static async getPostLikesCount(postId) {
    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE post_id = ?
      `;

      const [result] = await this.query(sql, [postId]);
      return result.count;
    } catch (error) {
      console.error("Get post likes count error:", error);
      throw error;
    }
  }
}

module.exports = PetPostLike;
