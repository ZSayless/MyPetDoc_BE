const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");

class Pet extends BaseModel {
  static tableName = "pets";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        is_deleted: convertBitToBoolean(data.is_deleted),
      });
    }
  }

  static async findById(id) {
    const petData = await super.findById(id);
    if (!petData) return null;
    return new Pet({
      ...petData,
      is_deleted: convertBitToBoolean(petData.is_deleted),
    });
  }

  static async findOne(conditions) {
    const petData = await super.findOne(conditions);
    if (!petData) return null;
    return new Pet(petData);
  }

  static async create(data) {
    try {
      const petData = await super.create(data);
      return new Pet(petData);
    } catch (error) {
      console.error("Error creating pet:", error);
      throw error;
    }
  }

  static async update(id, data) {
    const petData = await super.update(id, data);
    return new Pet(petData);
  }

  static async findAll(filters = {}, options = {}) {
    const pets = await super.findAll(filters, options);
    return pets.map(
      (petData) =>
        new Pet({
          ...petData,
          is_deleted: convertBitToBoolean(petData.is_deleted),
        })
    );
  }

  static async findByUserId(userId) {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE user_id = ? AND is_deleted = 0
      `;
      const pets = await this.query(sql, [userId]);
      return pets.map(
        (petData) =>
          new Pet({
            ...petData,
            is_deleted: convertBitToBoolean(petData.is_deleted),
          })
      );
    } catch (error) {
      console.error("FindByUserId error:", error);
      throw error;
    }
  }

  static async countByUserId(userId) {
    try {
      const sql = `
        SELECT COUNT(*) as total 
        FROM ${this.tableName} 
        WHERE user_id = ? AND is_deleted = 0
      `;
      const [result] = await this.query(sql, [userId]);
      return result.total;
    } catch (error) {
      console.error("CountByUserId error:", error);
      throw error;
    }
  }

  static async hardDelete(id) {
    await super.hardDelete(id);
  }

  static async softDelete(id) {
    await super.softDelete(id);
  }

  static async updateWithoutVersion(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key) => `${key} = ?`).join(", ");

    await this.query(
      `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
    return this.findById(id);
  }
}

module.exports = Pet; 