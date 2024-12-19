const BaseModel = require("./BaseModel");

class Hospital extends BaseModel {
  static tableName = "hospitals";

  static async findByName(name) {
    return this.findOne({ name });
  }

  static async findAllActive(options = {}) {
    const { page = 1, limit = 10, search = "" } = options;
    const offset = (page - 1) * limit;

    const [rows] = await this.connection.query(
      `SELECT * FROM ${this.tableName} 
       WHERE is_deleted = 0 
       AND name LIKE ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [`%${search}%`, limit, offset]
    );
    return rows;
  }

  static async getStats() {
    const [rows] = await this.connection.query(
      `SELECT COUNT(*) as total,
       SUM(CASE WHEN is_deleted = 0 THEN 1 ELSE 0 END) as active
       FROM ${this.tableName}`
    );
    return rows[0];
  }
}

module.exports = Hospital;
