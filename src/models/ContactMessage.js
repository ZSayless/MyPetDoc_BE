const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");
class ContactMessage extends BaseModel {
  static tableName = "contact_messages";
  // Constructor để chuyển đổi dữ liệu
  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        is_deleted: convertBitToBoolean(data.is_deleted),
      });
    }
  }
  // Phương thức tìm kiếm
  static async search(searchParams = {}, options = {}) {
    try {
      const {
        offset = 0,
        limit = 10,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = options;

      // Chỉ lấy các tham số có giá trị
      const validSearchParams = {};
      if (searchParams.email) validSearchParams.email = searchParams.email;
      if (searchParams.name) validSearchParams.name = searchParams.name;
      if (searchParams.user_id)
        validSearchParams.user_id = searchParams.user_id;

      let conditions = ["cm.is_deleted = 0"];
      let params = [];

      // Xử lý các tham số tìm kiếm
      Object.entries(validSearchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (key === "user_id") {
            conditions.push(`cm.${key} = ?`);
            params.push(value);
          } else {
            conditions.push(`cm.${key} LIKE ?`);
            params.push(`%${value}%`);
          }
        }
      });

      // Tạo câu query với alias cho bảng
      const sql = `
        SELECT 
          cm.*,
          u.email as user_email,
          u.full_name as user_full_name
        FROM ${this.tableName} cm
        LEFT JOIN users u ON cm.user_id = u.id
        WHERE ${conditions.join(" AND ")}
        ORDER BY cm.${sortBy} ${sortOrder}
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;

      // Câu query đếm tổng số
      const countSql = `
        SELECT COUNT(*) as total 
        FROM ${this.tableName} cm
        WHERE ${conditions.join(" AND ")}
      `;

      const messages = await this.query(sql, params);
      const [countResult] = await this.query(countSql, params);
      const total = countResult.total;

      return {
        messages: messages.map((message) => new ContactMessage(message)),
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Search contact messages error:", error);
      throw error;
    }
  }
  // Override các phương thức từ BaseModel
  static async findOne(conditions) {
    const messageData = await super.findOne(conditions);
    if (!messageData) return null;
    return new ContactMessage(messageData);
  }
  static async findById(id) {
    const messageData = await super.findById(id);
    if (!messageData) return null;
    return new ContactMessage(messageData);
  }
  static async create(data) {
    const messageData = await super.create(data);
    return new ContactMessage(messageData);
  }
  static async update(id, data) {
    const messageData = await super.update(id, data);
    return new ContactMessage(messageData);
  }
  static async findAll(filters = {}, options = {}) {
    const messages = await super.findAll(filters, options);
    return messages.map((messageData) => new ContactMessage(messageData));
  }
  // Phương thức xóa mềm
  static async softDelete(id) {
    await this.update(id, { is_deleted: true });
  }
  // Phương thức xóa cứng
  static async hardDelete(id) {
    await super.hardDelete(id);
  }
  // Phương thức gửi email phản hồi
  static async sendResponseEmail(messageId, responseText) {
    try {
      const message = await this.findById(messageId);
      if (!message) {
        throw new Error("Không tìm thấy tin nhắn");
      }
      // Gửi email phản hồi
      await EmailService.sendContactResponseEmail(message.email, {
        name: message.name,
        originalMessage: message.message,
        responseText: responseText,
      });
      // Cập nhật trạng thái đã phản hồi
      await this.update(messageId, {
        responded_at: new Date(),
        response: responseText,
      });
      return true;
    } catch (error) {
      console.error("Send response email error:", error);
      throw error;
    }
  }
  static async countMessages(filters = {}) {
    try {
      let conditions = ["cm.is_deleted = 0"];
      let params = [];

      // Filter theo khoảng thời gian
      if (filters.from) {
        conditions.push("cm.created_at >= ?");
        params.push(filters.from);
      }
      if (filters.to) {
        conditions.push("cm.created_at <= ?");
        params.push(filters.to);
      }

      // Đếm theo status - bỏ date khỏi SELECT
      const sql = `
        SELECT 
          COUNT(*) as total,
          cm.status
        FROM ${this.tableName} cm
        WHERE ${conditions.join(" AND ")}
        GROUP BY cm.status
      `;

      const results = await this.query(sql, params);

      // Format kết quả
      const stats = {
        total: 0,
        stats: {
          pending: 0,
          processing: 0,
          completed: 0,
          cancelled: 0,
        },
      };

      results.forEach((row) => {
        stats.total += parseInt(row.total);
        stats.stats[row.status] = parseInt(row.total);
      });

      // Đếm theo ngày/tuần/tháng
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thisWeek = new Date(today);
      thisWeek.setDate(today.getDate() - today.getDay());

      const thisMonth = new Date(today);
      thisMonth.setDate(1);

      const timeRanges = {
        today: today,
        thisWeek: thisWeek,
        thisMonth: thisMonth,
      };

      const byDate = {};
      for (const [key, date] of Object.entries(timeRanges)) {
        const sql = `
          SELECT COUNT(*) as count
          FROM ${this.tableName} cm
          WHERE cm.is_deleted = 0
          AND cm.created_at >= ?
        `;
        const [result] = await this.query(sql, [date]);
        byDate[key] = parseInt(result.count);
      }

      return {
        ...stats,
        byDate,
      };
    } catch (error) {
      console.error("Count messages error:", error);
      throw error;
    }
  }
}

module.exports = ContactMessage;
