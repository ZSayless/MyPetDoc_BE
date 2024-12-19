const BaseModel = require("./BaseModel");

class ContactInformation extends BaseModel {
  static tableName = "contact_information";

  static async getCurrent() {
    const [rows] = await this.connection.query(
      `SELECT * FROM ${this.tableName}
       WHERE is_deleted = 0
       ORDER BY created_at DESC
       LIMIT 1`
    );
    return rows[0];
  }
}

module.exports = ContactInformation;
