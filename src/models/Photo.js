const BaseModel = require("./BaseModel");

class Photo extends BaseModel {
  static tableName = "photos";

  static async findByHospital(hospitalId) {
    const [rows] = await this.connection.query(
      `SELECT * FROM ${this.tableName}
       WHERE hospital_id = ? AND is_deleted = 0
       ORDER BY created_at DESC`,
      [hospitalId]
    );
    return rows;
  }
}

module.exports = Photo;
