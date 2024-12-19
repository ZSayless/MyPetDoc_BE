const BaseModel = require("./BaseModel");

class Favorite extends BaseModel {
  static tableName = "favorites";

  static async findUserFavorites(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const [rows] = await this.connection.query(
      `SELECT f.*, h.name as hospital_name, h.address
       FROM ${this.tableName} f
       JOIN hospitals h ON f.hospital_id = h.id
       WHERE f.user_id = ? AND f.is_deleted = 0
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  }

  static async toggleFavorite(userId, hospitalId) {
    const favorite = await this.findOne({
      user_id: userId,
      hospital_id: hospitalId,
    });

    if (favorite) {
      await this.softDelete(favorite.id);
      return false;
    } else {
      await this.create({ user_id: userId, hospital_id: hospitalId });
      return true;
    }
  }
}

module.exports = Favorite;
