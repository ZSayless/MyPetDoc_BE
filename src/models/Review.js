const BaseModel = require("./BaseModel");

class Review extends BaseModel {
  static tableName = "reviews";

  static async findByHospital(hospitalId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const [rows] = await this.connection.query(
      `SELECT r.*, u.full_name as user_name 
       FROM ${this.tableName} r
       JOIN users u ON r.user_id = u.id
       WHERE r.hospital_id = ? AND r.is_deleted = 0
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [hospitalId, limit, offset]
    );
    return rows;
  }

  static async getAverageRating(hospitalId) {
    const [rows] = await this.connection.query(
      `SELECT AVG(rating) as average_rating
       FROM ${this.tableName}
       WHERE hospital_id = ? AND is_deleted = 0`,
      [hospitalId]
    );
    return rows[0].average_rating || 0;
  }
}

module.exports = Review;
