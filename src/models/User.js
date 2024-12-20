const BaseModel = require("./BaseModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const convertBitToBoolean = (bitField) => {
  if (bitField === null || bitField === undefined) return false;
  return Buffer.isBuffer(bitField)
    ? bitField.readInt8(0) === 1
    : Boolean(bitField);
};

class User extends BaseModel {
  static tableName = "users";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }

  generateAuthToken() {
    return jwt.sign(
      {
        id: this.id,
        role: this.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "24h",
      }
    );
  }

  static async findOne(conditions) {
    const userData = await super.findOne(conditions);
    if (!userData) return null;
    return new User(userData);
  }

  static async create(data) {
    const userData = await super.create(data);
    return new User(userData);
  }

  static async update(id, data) {
    const userData = await super.update(id, data);
    return new User(userData);
  }

  static async hardDelete(id) {
    await super.hardDelete(id);
  }

  static async softDelete(id) {
    await super.softDelete(id);
  }

  static async findByEmail(email) {
    const userData = await this.findOne({ email });
    if (!userData) return null;

    userData.is_locked = convertBitToBoolean(userData.is_locked);
    userData.is_active = convertBitToBoolean(userData.is_active);

    return new User(userData);
  }

  static async findById(id) {
    const userData = await super.findById(id);

    if (!userData) {
      return null;
    }

    // Chuyển đổi các trường bit thành boolean
    const user = new User({
      ...userData,
      is_active: convertBitToBoolean(userData.is_active),
      is_locked: convertBitToBoolean(userData.is_locked),
      is_deleted: convertBitToBoolean(userData.is_deleted),
    });

    return user;
  }

  static async isEmailTaken(email, excludeUserId) {
    try {
      const sql = excludeUserId
        ? `SELECT COUNT(*) as count FROM ${this.tableName} WHERE email = ? AND id != ?`
        : `SELECT COUNT(*) as count FROM ${this.tableName} WHERE email = ?`;

      const params = excludeUserId ? [email, excludeUserId] : [email];
      const rows = await this.query(sql, params);

      return rows[0]?.count > 0;
    } catch (error) {
      console.error("IsEmailTaken error:", error);
      throw error;
    }
  }

  static async findAll(filters = {}, options = {}) {
    const users = await super.findAll(filters, options);

    // Chuyển đổi các trường bit thành boolean cho mỗi user
    return users.map(
      (userData) =>
        new User({
          ...userData,
          is_active: convertBitToBoolean(userData.is_active),
          is_locked: convertBitToBoolean(userData.is_locked),
          is_deleted: convertBitToBoolean(userData.is_deleted),
        })
    );
  }

  async isPasswordMatch(password) {
    return await bcrypt.compare(password, this.password);
  }
}

module.exports = User;
