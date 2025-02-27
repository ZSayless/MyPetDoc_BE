const db = require("../config/db");

class BaseModel {
  static tableName = "";

  static async query(sql, params = []) {
    try {
      const [rows] = await db.execute(sql, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const rows = await this.query(sql, [id]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async findOne(conditions) {
    try {
      const entries = Object.entries(conditions);
      const where = entries.map(([key]) => `${key} = ?`).join(" AND ");
      const values = entries.map(([_, value]) => value);

      const sql = `SELECT * FROM ${this.tableName} WHERE ${where} LIMIT 1`;
      const rows = await this.query(sql, values);
      return rows && rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}, options = {}) {
    try {
      const { offset = 0, limit = 10 } = options;
      const entries = Object.entries(filters);
      const where =
        entries.length > 0
          ? entries.map(([key]) => `${key} = ?`).join(" AND ")
          : "1=1";
      const values = entries.map(([_, value]) => value);

      const limitValue = parseInt(limit);
      const offsetValue = parseInt(offset);

      const sql = `
        SELECT * FROM ${this.tableName} 
        WHERE ${where} AND is_deleted = 0
        LIMIT ${limitValue} OFFSET ${offsetValue}
      `;

      return await this.query(sql, values);
    } catch (error) {
      throw error;
    }
  }

  static async count(filters = {}) {
    try {
      const entries = Object.entries(filters);
      const where =
        entries.length > 0
          ? entries.map(([key]) => `${key} = ?`).join(" AND ")
          : "1=1";
      const values = entries.map(([_, value]) => value);

      const sql = `
        SELECT COUNT(*) as total 
        FROM ${this.tableName} 
        WHERE ${where} AND is_deleted = 0
      `;

      const [result] = await this.query(sql, values);
      return result.total;
    } catch (error) {
      throw error;
    }
  }

  static async create(data) {
    try {
      // Lấy tên các cột trong bảng
      const [columnsResult] = await this.query(
        `
        SELECT GROUP_CONCAT(COLUMN_NAME) as columns
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE()
      `,
        [this.tableName]
      );

      // Check and process the result
      if (!columnsResult || !columnsResult.columns) {
        throw new Error("Could not fetch table columns");
      }

      // Convert string columns to array
      const validFields = columnsResult.columns.split(",");

      const filteredData = {};

      for (const key in data) {
        // Skip values and automatic fields
        if (
          key === "values" ||
          key === "id" ||
          key === "created_at" ||
          key === "updated_at"
        )
          continue;

        if (validFields.includes(key)) {
          // Process special values
          if (data[key] === undefined) {
            filteredData[key] = null;
          } else if (typeof data[key] === "boolean") {
            filteredData[key] = data[key] ? 1 : 0;
          } else {
            filteredData[key] = data[key];
          }
        }
      }

      // If no valid data
      if (Object.keys(filteredData).length === 0) {
        throw new Error("No valid fields provided");
      }

      // Create query
      const fields = Object.keys(filteredData);
      const values = Object.values(filteredData);
      const placeholders = Array(values.length).fill("?").join(", ");

      const sql = `
        INSERT INTO ${this.tableName} 
        (${fields.join(", ")}) 
        VALUES (${placeholders})
      `;

      // Execute query
      const result = await this.query(sql, values);

      // Return created data
      if (result && result.insertId) {
        return await this.findById(result.insertId);
      }
      return null;
    } catch (error) {
      console.error(`Create ${this.tableName} error:`, error);
      throw error;
    }
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
