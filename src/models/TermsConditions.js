const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");

class TermsConditions extends BaseModel {
  static tableName = "terms_conditions";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        is_deleted: convertBitToBoolean(data.is_deleted),
      });
    }
  }

  // Lấy điều khoản hiện tại (active)
  static async getCurrentTerms() {
    try {
      const sql = `
        SELECT tc.*, u.full_name as last_updated_by_name
        FROM ${this.tableName} tc
        LEFT JOIN users u ON tc.last_updated_by = u.id
        WHERE tc.is_deleted = 0
        AND tc.effective_date <= CURRENT_DATE()
        ORDER BY tc.effective_date DESC, tc.version DESC
        LIMIT 1
      `;

      const [termsData] = await this.query(sql);
      return termsData ? new TermsConditions(termsData) : null;
    } catch (error) {
      console.error("Get current terms error:", error);
      throw error;
    }
  }

  // Tạo phiên bản mới
  static async createNewVersion(data, userId) {
    try {
      // Validate ngày hiệu lực
      if (!data.effective_date) {
        throw new Error("Effective date is required");
      }

      // Lấy version hiện tại
      const currentTerms = await this.getCurrentTerms();
      const newVersion = currentTerms ? currentTerms.version + 1 : 1;

      const newData = {
        ...data,
        version: newVersion,
        last_updated_by: userId,
      };

      const termsData = await super.create(newData);
      return new TermsConditions(termsData);
    } catch (error) {
      console.error("Create new terms version error:", error);
      throw error;
    }
  }

  // Lấy lịch sử các phiên bản
  static async getVersionHistory(page = 1, limit = 10) {
    try {
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const offset = (pageNumber - 1) * limitNumber;

      const sql = `
        SELECT tc.*, u.full_name as last_updated_by_name
        FROM ${this.tableName} tc
        LEFT JOIN users u ON tc.last_updated_by = u.id
        WHERE tc.is_deleted = 0
        ORDER BY tc.effective_date DESC, tc.version DESC
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
        versions: versions.map((version) => new TermsConditions(version)),
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limitNumber),
        },
      };
    } catch (error) {
      console.error("Get terms version history error:", error);
      throw error;
    }
  }

  // Lấy một phiên bản cụ thể
  static async getVersion(version) {
    try {
      const sql = `
        SELECT tc.*, u.full_name as last_updated_by_name
        FROM ${this.tableName} tc
        LEFT JOIN users u ON tc.last_updated_by = u.id
        WHERE tc.version = ? AND tc.is_deleted = 0
      `;

      const [termsData] = await this.query(sql, [version]);
      return termsData ? new TermsConditions(termsData) : null;
    } catch (error) {
      console.error("Get terms version error:", error);
      throw error;
    }
  }

  // Lấy điều khoản có hiệu lực tại một thời điểm
  static async getEffectiveTerms(date = new Date()) {
    try {
      const sql = `
        SELECT tc.*, u.full_name as last_updated_by_name
        FROM ${this.tableName} tc
        LEFT JOIN users u ON tc.last_updated_by = u.id
        WHERE tc.is_deleted = 0 
        AND tc.effective_date <= ?
        ORDER BY tc.effective_date DESC, tc.version DESC
        LIMIT 1
      `;

      const [termsData] = await this.query(sql, [date]);
      return termsData ? new TermsConditions(termsData) : null;
    } catch (error) {
      console.error("Get effective terms error:", error);
      throw error;
    }
  }

  // Toggle soft delete status
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
      const termsData = await super.update(id, { is_deleted: newStatus });
      return new TermsConditions(termsData);
    } catch (error) {
      console.error("Toggle soft delete error:", error);
      throw error;
    }
  }

  // Hard delete
  static async hardDelete(id) {
    try {
      const termsData = await super.hardDelete(id);
      return new TermsConditions(termsData);
    } catch (error) {
      console.error("Hard delete error:", error);
      throw error;
    }
  }

  // Override các phương thức cơ bản
  static async findOne(conditions) {
    const termsData = await super.findOne(conditions);
    return termsData ? new TermsConditions(termsData) : null;
  }

  static async create(data) {
    const termsData = await super.create(data);
    return new TermsConditions(termsData);
  }

  static async update(id, data) {
    const termsData = await super.update(id, data);
    return new TermsConditions(termsData);
  }

  static async findById(id) {
    const termsData = await super.findById(id);
    return termsData ? new TermsConditions(termsData) : null;
  }
}

module.exports = TermsConditions;
