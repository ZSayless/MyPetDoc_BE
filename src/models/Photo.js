const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");

class Photo extends BaseModel {
  static tableName = "photos";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        is_deleted: convertBitToBoolean(data.is_deleted),
      });
    }
  }

  static async create(data) {
    try {
      const sql = `
        INSERT INTO ${this.tableName} 
        (image_url, description, review_id, user_id, hospital_id, is_deleted) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const params = [
        data.image_url,
        data.description || null,
        data.review_id,
        data.user_id,
        data.hospital_id,
        false,
      ];

      const [result] = await this.query(sql, params);
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  static async findByReviewId(reviewId) {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE review_id = ? AND is_deleted = 0
      `;

      const [photos] = await this.query(sql, [reviewId]);
      return photos ? photos.map((photo) => new Photo(photo)) : [];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Photo;
