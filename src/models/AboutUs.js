const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");

class AboutUs extends BaseModel {
  static tableName = "about_us";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        is_deleted: convertBitToBoolean(data.is_deleted),
      });
    }
  }

  // Tìm thông tin about us hiện tại (active)
  static async getCurrentAboutUs() {
    try {
      const sql = `
        SELECT au.*, u.full_name as last_updated_by_name
        FROM ${this.tableName} au
        LEFT JOIN users u ON au.last_updated_by = u.id
        WHERE au.is_deleted = 0
        ORDER BY au.version DESC
        LIMIT 1
      `;

      const [aboutUsData] = await this.query(sql);
      return aboutUsData ? new AboutUs(aboutUsData) : null;
    } catch (error) {
      console.error("Get current about us error:", error);
      throw error;
    }
  }

  // Tạo phiên bản mới
  static async createNewVersion(data, userId) {
    try {
      // Lấy version hiện tại
      const currentVersion = await this.getCurrentAboutUs();
      const newVersion = currentVersion ? currentVersion.version + 1 : 1;

      const newData = {
        ...data,
        version: newVersion,
        last_updated_by: userId,
      };

      const aboutUsData = await super.create(newData);
      return new AboutUs(aboutUsData);
    } catch (error) {
      console.error("Create new about us version error:", error);
      throw error;
    }
  }

  // Lấy lịch sử các phiên bản
  static async getVersionHistory(page = 1, limit = 10) {
    try {
      // Chuyển đổi tham số sang số
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const offset = (pageNumber - 1) * limitNumber;

      // Query để lấy danh sách phiên bản
      const sql = `
        SELECT au.*, u.full_name as last_updated_by_name
        FROM ${this.tableName} au
        LEFT JOIN users u ON au.last_updated_by = u.id
        WHERE au.is_deleted = 0
        ORDER BY au.version DESC
        LIMIT ${limitNumber} OFFSET ${offset}
      `;

      // Query để đếm tổng số phiên bản
      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        WHERE is_deleted = 0
      `;

      // Thực hiện cả 2 query
      const [versions, [countResult]] = await Promise.all([
        this.query(sql),
        this.query(countSql),
      ]);

      return {
        versions: versions.map((version) => new AboutUs(version)),
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limitNumber),
        },
      };
    } catch (error) {
      console.error("Get about us version history error:", error);
      throw error;
    }
  }

  // Lấy một phiên bản cụ thể
  static async getVersion(version) {
    try {
      const sql = `
        SELECT au.*, u.full_name as last_updated_by_name
        FROM ${this.tableName} au
        LEFT JOIN users u ON au.last_updated_by = u.id
        WHERE au.version = ? AND au.is_deleted = 0
      `;

      const [aboutUsData] = await this.query(sql, [version]);
      return aboutUsData ? new AboutUs(aboutUsData) : null;
    } catch (error) {
      console.error("Get about us version error:", error);
      throw error;
    }
  }

  // Override các phương thức cơ bản
  static async findOne(conditions) {
    const aboutUsData = await super.findOne(conditions);
    return aboutUsData ? new AboutUs(aboutUsData) : null;
  }

  static async create(data) {
    const aboutUsData = await super.create(data);
    return new AboutUs(aboutUsData);
  }

  static async toggleSoftDelete(id) {
    try {
      // Lấy trạng thái hiện tại
      const currentData = await this.findById(id);
      if (!currentData) {
        throw new Error("Record not found");
      }

      // Đảo ngược trạng thái is_deleted
      const newStatus = !currentData.is_deleted;

      // Cập nhật trạng thái mới
      const aboutUsData = await super.update(id, { is_deleted: newStatus });
      return new AboutUs(aboutUsData);
    } catch (error) {
      console.error("Toggle soft delete error:", error);
      throw error;
    }
  }

  static async hardDelete(id) {
    const aboutUsData = await super.hardDelete(id);
    return new AboutUs(aboutUsData);
  }

  static async update(id, data) {
    const aboutUsData = await super.update(id, data);
    return new AboutUs(aboutUsData);
  }

  static async findById(id) {
    const aboutUsData = await super.findById(id);
    return aboutUsData ? new AboutUs(aboutUsData) : null;
  }
}

module.exports = AboutUs;
