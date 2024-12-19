const BaseModel = require("./BaseModel");

class Faq extends BaseModel {
  static tableName = "faqs";

  static async findActive() {
    const [rows] = await this.connection.query(
      `SELECT * FROM ${this.tableName}
       WHERE is_deleted = 0
       ORDER BY created_at DESC`
    );
    return rows;
  }
}

module.exports = Faq;
