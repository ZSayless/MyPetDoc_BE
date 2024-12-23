const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");
class Hospital extends BaseModel {
  static tableName = "hospitals";
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
      // Đảm bảo searchParams không bị undefined
      searchParams = searchParams || {};
      options = options || {};
      const {
        offset = 0,
        limit = 10,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = options;
      // Chỉ lấy các tham số có giá trị
      const validSearchParams = {};
      if (searchParams.name) validSearchParams.name = searchParams.name;
      if (searchParams.address)
        validSearchParams.address = searchParams.address;
      if (searchParams.department)
        validSearchParams.department = searchParams.department;
      if (searchParams.specialties)
        validSearchParams.specialties = searchParams.specialties;
      let conditions = ["is_deleted = 0"];
      let params = [];
      // Xử lý các tham số tìm kiếm
      Object.entries(validSearchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          conditions.push(`${key} LIKE ?`);
          params.push(`%${value}%`);
        }
      });
      // Tạo câu query với điều kiện tìm kiếm
      const sql = `
       SELECT * FROM ${this.tableName}
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
     `;
      const hospitals = await this.query(sql, params);
      // Đếm tổng số kết quả
      const countSql = `
       SELECT COUNT(*) as total 
       FROM ${this.tableName}
       WHERE ${conditions.join(" AND ")}
     `;
      const [countResult] = await this.query(countSql, params);
      const total = countResult.total;
      return {
        data: hospitals.map((hospital) => new Hospital(hospital)),
      };
    } catch (error) {
      console.error("Search hospitals error:", error);
      throw error;
    }
  }
  // Phương thức đếm số lượng kết quả tìm kiếm
  static async countSearch(searchParams = {}) {
    try {
      // Đảm bảo searchParams không bị undefined
      searchParams = searchParams || {};
      // Chỉ lấy các tham số có giá trị
      const validSearchParams = {};
      if (searchParams.name) validSearchParams.name = searchParams.name;
      if (searchParams.address)
        validSearchParams.address = searchParams.address;
      if (searchParams.department)
        validSearchParams.department = searchParams.department;
      if (searchParams.specialties)
        validSearchParams.specialties = searchParams.specialties;
      let conditions = ["is_deleted = 0"];
      let params = [];
      // Xử lý các tham số tìm kiếm
      Object.entries(validSearchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          conditions.push(`${key} LIKE ?`);
          params.push(`%${value}%`);
        }
      });
      const sql = `
       SELECT COUNT(*) as total 
       FROM ${this.tableName}
       WHERE ${conditions.join(" AND ")}
     `;
      const [result] = await this.query(sql, params);
      return result.total;
    } catch (error) {
      console.error("Count search hospitals error:", error);
      throw error;
    }
  }
  // Phương thức kiểm tra tên đã tồn tại
  static async isNameTaken(name, excludeId = null) {
    try {
      const sql = excludeId
        ? `SELECT id FROM ${this.tableName} WHERE name = ? AND id != ? AND is_deleted = 0`
        : `SELECT id FROM ${this.tableName} WHERE name = ? AND is_deleted = 0`;
      const params = excludeId ? [name, excludeId] : [name];
      const result = await this.query(sql, params);
      return result.length > 0;
    } catch (error) {
      console.error("IsNameTaken error:", error);
      throw error;
    }
  }
  // Override các phương thức từ BaseModel
  static async findOne(conditions) {
    const hospitalData = await super.findOne(conditions);
    if (!hospitalData) return null;
    return new Hospital(hospitalData);
  }
  static async findById(id) {
    const hospitalData = await super.findById(id);
    if (!hospitalData) return null;
    return new Hospital(hospitalData);
  }
  static async create(data) {
    const hospitalData = await super.create(data);
    return new Hospital(hospitalData);
  }
  static async update(id, data) {
    const hospitalData = await super.update(id, data);
    return new Hospital(hospitalData);
  }
  static async findAll(filters = {}, options = {}) {
    const hospitals = await super.findAll(filters, options);
    return hospitals.map((hospitalData) => new Hospital(hospitalData));
  }
  // Phương thức xóa mềm
  static async softDelete(id) {
    await this.update(id, { is_deleted: true });
  }
  // Phương thức xóa cứng
  static async hardDelete(id) {
    await super.hardDelete(id);
  }
}

module.exports = Hospital;
