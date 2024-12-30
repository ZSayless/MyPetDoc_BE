const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");

class FAQ extends BaseModel {
  static tableName = "faqs";

  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        is_deleted: convertBitToBoolean(data.is_deleted),
      });
    }
  }

  // Lấy danh sách FAQ có phân trang
  static async findAll(page = 1, limit = 10, includeDeleted = false) {
    try {
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const offset = (pageNumber - 1) * limitNumber;

      let sql = `
        SELECT f.*
        FROM ${this.tableName} f
      `;

      if (!includeDeleted) {
        sql += " WHERE f.is_deleted = 0";
      }

      sql += `
        ORDER BY f.created_at DESC
        LIMIT ${limitNumber} OFFSET ${offset}
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        ${!includeDeleted ? "WHERE is_deleted = 0" : ""}
      `;

      const [faqs, [countResult]] = await Promise.all([
        this.query(sql),
        this.query(countSql),
      ]);

      return {
        faqs: faqs.map((faq) => new FAQ(faq)),
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limitNumber),
        },
      };
    } catch (error) {
      console.error("Find all FAQs error:", error);
      throw error;
    }
  }

  // Tìm kiếm FAQ
  static async search(keyword, page = 1, limit = 10) {
    try {
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const offset = (pageNumber - 1) * limitNumber;

      const searchSql = `
        SELECT f.*
        FROM ${this.tableName} f
        WHERE f.is_deleted = 0 
        AND (
          f.question LIKE ? OR 
          f.answer LIKE ?
        )
        ORDER BY f.created_at DESC
        LIMIT ${limitNumber} OFFSET ${offset}
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        WHERE is_deleted = 0
        AND (
          question LIKE ? OR 
          answer LIKE ?
        )
      `;

      const searchPattern = `%${keyword}%`;
      const [faqs, [countResult]] = await Promise.all([
        this.query(searchSql, [searchPattern, searchPattern]),
        this.query(countSql, [searchPattern, searchPattern]),
      ]);

      return {
        faqs: faqs.map((faq) => new FAQ(faq)),
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limitNumber),
        },
      };
    } catch (error) {
      console.error("Search FAQs error:", error);
      throw error;
    }
  }

  // Tạo FAQ mới
  static async create(data) {
    try {
      const faqData = await super.create(data);
      return new FAQ(faqData);
    } catch (error) {
      console.error("Create FAQ error:", error);
      throw error;
    }
  }

  // Cập nhật FAQ
  static async update(id, data) {
    try {
      const faqData = await super.update(id, data);
      return new FAQ(faqData);
    } catch (error) {
      console.error("Update FAQ error:", error);
      throw error;
    }
  }

  // Toggle soft delete
  static async toggleSoftDelete(id) {
    try {
      const faq = await this.findById(id);
      if (!faq) {
        throw new Error("FAQ not found");
      }

      const newStatus = !faq.is_deleted;
      const faqData = await super.update(id, { is_deleted: newStatus });
      return new FAQ(faqData);
    } catch (error) {
      console.error("Toggle FAQ soft delete error:", error);
      throw error;
    }
  }

  // Xóa vĩnh viễn
  static async hardDelete(id) {
    try {
      const faqData = await super.hardDelete(id);
      return new FAQ(faqData);
    } catch (error) {
      console.error("Hard delete FAQ error:", error);
      throw error;
    }
  }

  // Override các phương thức cơ bản
  static async findOne(conditions) {
    const faqData = await super.findOne(conditions);
    return faqData ? new FAQ(faqData) : null;
  }

  static async findById(id) {
    const faqData = await super.findById(id);
    return faqData ? new FAQ(faqData) : null;
  }
}

module.exports = FAQ;
