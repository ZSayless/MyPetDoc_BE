const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");

class ContactInformation extends BaseModel {
  static tableName = "contact_information";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        is_deleted: convertBitToBoolean(data.is_deleted),
      });
    }
  }

  // Get current contact information
  static async getCurrentContact() {
    try {
      const sql = `
        SELECT ci.*, u.full_name as last_updated_by_name
        FROM ${this.tableName} ci
        LEFT JOIN users u ON ci.last_updated_by = u.id
        WHERE ci.is_deleted = 0
        ORDER BY ci.version DESC
        LIMIT 1
      `;

      const [contactData] = await this.query(sql);
      return contactData ? new ContactInformation(contactData) : null;
    } catch (error) {
      console.error("Get current contact error:", error);
      throw error;
    }
  }

  // Create new version
  static async createNewVersion(data, userId) {
    try {
      // Get current version
      const currentContact = await this.getCurrentContact();
      const newVersion = currentContact ? currentContact.version + 1 : 1;

      const newData = {
        ...data,
        version: newVersion,
        last_updated_by: userId,
      };

      const contactData = await super.create(newData);
      return new ContactInformation(contactData);
    } catch (error) {
      console.error("Create new contact version error:", error);
      throw error;
    }
  }

  // Get version history
  static async getVersionHistory(page = 1, limit = 10) {
    try {
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const offset = (pageNumber - 1) * limitNumber;

      const sql = `
        SELECT ci.*, u.full_name as last_updated_by_name
        FROM ${this.tableName} ci
        LEFT JOIN users u ON ci.last_updated_by = u.id
        WHERE ci.is_deleted = 0
        ORDER BY ci.version DESC
        LIMIT ${limitNumber} OFFSET ${offset}
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        WHERE is_deleted = 0
      `;

      const [versions, [countResult]] = await Promise.all([
        this.query(sql),
        this.query(countSql),
      ]);

      return {
        versions: versions.map((version) => new ContactInformation(version)),
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limitNumber),
        },
      };
    } catch (error) {
      console.error("Get contact version history error:", error);
      throw error;
    }
  }

  // Get a specific version
  static async getVersion(version) {
    try {
      const sql = `
        SELECT ci.*
        FROM ${this.tableName} ci
        WHERE ci.id = ?
      `;

      const [contactData] = await this.query(sql, [version]);
      return contactData ? new ContactInformation(contactData) : null;
    } catch (error) {
      console.error("Get contact version error:", error);
      throw error;
    }
  }

  // Toggle soft delete
  static async toggleSoftDelete(id) {
    try {
      const currentData = await this.findById(id);
      if (!currentData) {
        throw new Error("Record not found");
      }
      const currentIsDeleted = currentData.is_deleted[0] === 1;
      const newStatus = !currentIsDeleted;
      const contactData = await super.update(id, { is_deleted: newStatus });
      return new ContactInformation(contactData);
    } catch (error) {
      console.error("Toggle soft delete error:", error);
      throw error;
    }
  }

  // Hard delete
  static async hardDelete(id) {
    try {
      const contactData = await super.hardDelete(id);
      return new ContactInformation(contactData);
    } catch (error) {
      console.error("Hard delete error:", error);
      throw error;
    }
  }

  // Compare two versions
  static async compareVersions(version1, version2) {
    try {
      const [v1, v2] = await Promise.all([
        this.getVersion(version1),
        this.getVersion(version2),
      ]);

      if (!v1 || !v2) {
        throw new Error("One or both versions not found");
      }

      return {
        version1: {
          version: v1.version,
          last_updated_by_name: v1.last_updated_by_name,
        },
        version2: {
          version: v2.version,
          last_updated_by_name: v2.last_updated_by_name,
        },
        differences: {
          email: this.compareField(v1.email, v2.email),
          phone: this.compareField(v1.phone, v2.phone),
          address: this.compareField(v1.address, v2.address),
          support_hours: this.compareField(v1.support_hours, v2.support_hours),
          support_description: this.compareField(
            v1.support_description,
            v2.support_description
          ),
        },
      };
    } catch (error) {
      console.error("Compare versions error:", error);
      throw error;
    }
  }

  // Helper method to compare two values
  static compareField(value1, value2) {
    if (value1 === value2) return null;
    return {
      old: value1,
      new: value2,
    };
  }
}

module.exports = ContactInformation;
