const BaseModel = require("./BaseModel");

class Banner extends BaseModel {
  static tableName = "banners";

  static async findActive() {
    const [rows] = await this.connection.query(
      `SELECT * FROM ${this.tableName}
       WHERE is_deleted = 0 AND is_active = 1
       ORDER BY created_at DESC`
    );
    return rows;
  }
}

module.exports = Banner;
