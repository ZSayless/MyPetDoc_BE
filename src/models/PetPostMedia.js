const BaseModel = require("./BaseModel");

class PetPostMedia extends BaseModel {
  static tableName = "pet_post_media";

  static async getPostMedia(postId) {
    try {
      const sql = `
        SELECT *
        FROM ${this.tableName}
        WHERE post_id = ?
        ORDER BY display_order ASC
      `;

      return await this.query(sql, [postId]);
    } catch (error) {
      console.error("Get post media error:", error);
      throw error;
    }
  }

  static async addMedia(postId, mediaData) {
    try {
      const sql = `
        INSERT INTO ${this.tableName}
        (post_id, media_type, media_url, caption, display_order)
        VALUES (?, ?, ?, ?, ?)
      `;

      const result = await this.query(sql, [
        postId,
        mediaData.media_type,
        mediaData.media_url,
        mediaData.caption || null,
        mediaData.display_order || 0,
      ]);

      return result.insertId;
    } catch (error) {
      console.error("Add media error:", error);
      throw error;
    }
  }

  static async removeMedia(mediaId) {
    try {
      const sql = `
        DELETE FROM ${this.tableName}
        WHERE id = ?
      `;

      await this.query(sql, [mediaId]);
      return true;
    } catch (error) {
      console.error("Remove media error:", error);
      throw error;
    }
  }
}

module.exports = PetPostMedia;
