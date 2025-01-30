const BaseModel = require("./BaseModel");

class HospitalImage extends BaseModel {
  static tableName = "hospital_images";

  static async create(data) {
    try {
      // Ensure required fields
      if (!data.hospital_id) {
        throw new Error("hospital_id is required");
      }
      if (!data.image_url) {
        throw new Error("image_url is required");
      }

      const sql = `
        INSERT INTO ${this.tableName} 
        (hospital_id, image_url, created_by)
        VALUES (?, ?, ?)
      `;

      const params = [
        data.hospital_id,
        data.image_url,
        data.created_by || null, // If no created_by, use null
      ];

      // console.log("SQL:", sql);
      // console.log("Params:", params);

      const result = await this.query(sql, params);
      // console.log("Insert result:", result);

      return this.findById(result.insertId);
    } catch (error) {
      console.error("Error in HospitalImage.create:", error);
      throw error;
    }
  }

  static async findByHospitalId(hospitalId) {
    const sql = `
      SELECT hi.*, 
             COUNT(DISTINCT hil.id) as likes_count
      FROM ${this.tableName} hi
      LEFT JOIN hospital_image_likes hil ON hi.id = hil.image_id
      WHERE hi.hospital_id = ?
      GROUP BY hi.id
      ORDER BY hi.created_at DESC
    `;
    return await this.query(sql, [hospitalId]);
  }

  static async findById(id) {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE id = ?
    `;
    const [result] = await this.query(sql, [id]);
    return result;
  }

  static async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    await this.query(sql, [id]);
    return true;
  }

  static async findOne(conditions) {
    const whereClause = Object.entries(conditions)
      .map(([key, value]) => `${key} = ?`)
      .join(" AND ");

    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${whereClause}
      LIMIT 1
    `;

    const params = Object.values(conditions);
    const [result] = await this.query(sql, params);
    return result || null;
  }

  static async hasUserLiked(imageId, userId) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM hospital_image_likes
      WHERE image_id = ? AND user_id = ?
    `;
    const [result] = await this.query(sql, [imageId, userId]);
    return result.count > 0;
  }

  static async addLike(imageId, userId) {
    const sql = `
      INSERT INTO hospital_image_likes (image_id, user_id)
      VALUES (?, ?)
    `;
    await this.query(sql, [imageId, userId]);
    return true;
  }

  static async removeLike(imageId, userId) {
    const sql = `
      DELETE FROM hospital_image_likes 
      WHERE image_id = ? AND user_id = ?
    `;
    await this.query(sql, [imageId, userId]);
    return true;
  }

  static async getLikesCount(imageId) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM hospital_image_likes
      WHERE image_id = ?
    `;
    const [result] = await this.query(sql, [imageId]);
    return result.count;
  }
}

module.exports = HospitalImage;
