const BaseModel = require("./BaseModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

class User extends BaseModel {
  static tableName = "users";

  static async create(data) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const userData = await super.create({
      ...data,
      password: hashedPassword,
    });
    return new User(userData);
  }

  static async findByEmail(email) {
    const userData = await this.findOne({ email });
    if (!userData) return null;

    userData.is_locked = userData.is_locked[0] === 1;
    userData.is_active = userData.is_active[0] === 1;

    return new User(userData);
  }

  static async findById(id) {
    const userData = await super.findById(id);
    if (!userData) return null;

    userData.is_locked = userData.is_locked[0] === 1;
    userData.is_active = userData.is_active[0] === 1;

    return new User(userData);
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

  constructor(data) {
    super();
    Object.assign(this, data);
  }

  async isPasswordMatch(password) {
    return bcrypt.compare(password, this.password);
  }

  generateAuthToken() {
    return jwt.sign(
      {
        id: this.id,
        role: this.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );
  }
}

module.exports = User;
