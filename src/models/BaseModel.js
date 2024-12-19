const db = require("../config/db");

class BaseModel {
  static tableName = "";

  static async query(sql, params = []) {
    try {
      const [rows] = await db.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  static async findOne(conditions) {
    try {
      const entries = Object.entries(conditions);
      const where = entries.map(([key]) => `${key} = ?`).join(" AND ");
      const values = entries.map(([_, value]) => value);

      const sql = `SELECT * FROM ${this.tableName} WHERE ${where} LIMIT 1`;
      const rows = await this.query(sql, values);
      return rows[0];
    } catch (error) {
      console.error('FindOne error:', error);
      throw error;
    }
  }

  static async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = Array(values.length).fill("?").join(", ");

    const sql = `INSERT INTO ${this.tableName} (${keys.join(
      ", "
    )}) VALUES (${placeholders})`;
    const [result] = await db.execute(sql, values);

    if (result.insertId) {
      return this.findOne({ id: result.insertId });
    }
    return null;
  }

  static async findById(id) {
    const [rows] = await this.query(
      `SELECT * FROM ${this.tableName} WHERE id = ? AND is_deleted = 0`,
      [id]
    );
    return rows[0];
  }

  static async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);

    const setClause = keys.map((key) => `${key} = ?`).join(", ");

    await this.query(
      `UPDATE ${this.tableName} SET ${setClause}, version = version + 1 WHERE id = ?`,
      [...values, id]
    );
    return this.findById(id);
  }

  static async softDelete(id) {
    await this.query(
      `UPDATE ${this.tableName} SET is_deleted = 1, version = version + 1 WHERE id = ?`,
      [id]
    );
  }

  static async hardDelete(id) {
    await this.query(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
  }
}

module.exports = BaseModel;
