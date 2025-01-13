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

  // Find current about us information (active)
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

  // Create new version
  static async createNewVersion(data, userId) {
    try {
      // Get current version
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

  // Get version history
  static async getVersionHistory(page = 1, limit = 10) {
    try {
      // Convert parameters to numbers
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const offset = (pageNumber - 1) * limitNumber;

      // Query to get version list
      const sql = `
        SELECT au.*, u.full_name as last_updated_by_name
        FROM ${this.tableName} au
        LEFT JOIN users u ON au.last_updated_by = u.id
        WHERE au.is_deleted = 0
        ORDER BY au.version DESC
        LIMIT ${limitNumber} OFFSET ${offset}
      `;

      // Query to count total versions
      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        WHERE is_deleted = 0
      `;

      // Execute both queries
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

  // Get a specific version
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

  // Override basic methods
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
      // Get current status
      const currentData = await this.findById(id);
      if (!currentData) {
        throw new Error("Record not found");
      }

      // Reverse is_deleted status
      const newStatus = !currentData.is_deleted;

      // Update new status
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
