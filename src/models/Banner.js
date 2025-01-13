const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");

class Banner extends BaseModel {
  static tableName = "banners";

  constructor(data) {
    super();
    if (data) {
      const is_deleted =
        data.is_deleted !== undefined
          ? convertBitToBoolean(data.is_deleted)
          : false;
      const is_active =
        data.is_active !== undefined
          ? convertBitToBoolean(data.is_active)
          : true;

      Object.assign(this, {
        ...data,
        is_deleted,
        is_active,
      });
    }
  }

  // Get all active banners
  static async findActive() {
    try {
      const sql = `
        SELECT 
          b.*,
          u.full_name as created_by_name,
          CAST(b.is_deleted AS UNSIGNED) as is_deleted,
          CAST(b.is_active AS UNSIGNED) as is_active
        FROM ${this.tableName} b
        LEFT JOIN users u ON b.created_by = u.id
        WHERE b.is_deleted = 0 AND b.is_active = 1
        ORDER BY b.created_at DESC
      `;

      const banners = await this.query(sql);
      return banners.map((banner) => {
        console.log("Banner data before conversion:", {
          id: banner.id,
          is_deleted: banner.is_deleted,
          is_active: banner.is_active,
        });

        return new Banner(banner);
      });
    } catch (error) {
      console.error("Find active banners error:", error);
      throw error;
    }
  }

  // Get all banners with pagination
  static async findAll(page = 1, limit = 10, includeDeleted = true) {
    try {
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const offset = (pageNumber - 1) * limitNumber;

      let sql = `
        SELECT 
          b.*,
          u.full_name as created_by_name,
          CAST(b.is_deleted AS UNSIGNED) as is_deleted,
          CAST(b.is_active AS UNSIGNED) as is_active
        FROM ${this.tableName} b
        LEFT JOIN users u ON b.created_by = u.id
      `;

      if (!includeDeleted) {
        sql += " WHERE b.is_deleted = 0";
      }

      sql += `
        ORDER BY b.created_at DESC
        LIMIT ${limitNumber} OFFSET ${offset}
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM ${this.tableName}
        ${!includeDeleted ? "WHERE is_deleted = 0" : ""}
      `;

      const [banners, [countResult]] = await Promise.all([
        this.query(sql),
        this.query(countSql),
      ]);

      console.log("Query results:", {
        includeDeleted,
        totalBanners: banners.length,
        banners: banners.map((b) => ({
          id: b.id,
          is_deleted: b.is_deleted,
          is_active: b.is_active,
        })),
      });

      return {
        banners: banners.map((banner) => new Banner(banner)),
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limitNumber),
        },
      };
    } catch (error) {
      console.error("Find all banners error:", error);
      throw error;
    }
  }

  // Tạo banner mới
  static async create(data) {
    try {
      const bannerData = await super.create(data);
      return new Banner(bannerData);
    } catch (error) {
      console.error("Create banner error:", error);
      throw error;
    }
  }

  // Update banner
  static async update(id, data) {
    try {
      const updateData = await super.update(id, data);
      return new Banner(updateData);
    } catch (error) {
      console.error("Update banner error:", error);
      throw error;
    }
  }

  // Toggle active status
  static async toggleActive(id) {
    try {
      const banner = await this.findById(id);
      if (!banner) {
        throw new Error("Banner not found");
      }

      const newStatus = !banner.is_active;
      const bannerData = await super.update(id, { is_active: newStatus });
      return new Banner(bannerData);
    } catch (error) {
      console.error("Toggle banner active status error:", error);
      throw error;
    }
  }

  // Toggle soft delete
  static async toggleSoftDelete(id) {
    try {
      const banner = await this.findById(id);
      if (!banner) {
        throw new Error("Banner not found");
      }

      const newStatus = !banner.is_deleted;
      const bannerData = await super.update(id, { is_deleted: newStatus });
      return new Banner(bannerData);
    } catch (error) {
      console.error("Toggle banner soft delete error:", error);
      throw error;
    }
  }

  // Hard delete
  static async hardDelete(id) {
    try {
      const bannerData = await super.hardDelete(id);
      return new Banner(bannerData);
    } catch (error) {
      console.error("Hard delete banner error:", error);
      throw error;
    }
  }

  // Override basic methods
  static async findOne(conditions) {
    const bannerData = await super.findOne(conditions);
    return bannerData ? new Banner(bannerData) : null;
  }

  static async findById(id) {
    const bannerData = await super.findById(id);
    return bannerData ? new Banner(bannerData) : null;
  }

  // New method to get banner by created_by
  static async findByCreatedBy(userId) {
    try {
      const sql = `
        SELECT b.*, u.full_name as created_by_name
        FROM ${this.tableName} b
        LEFT JOIN users u ON b.created_by = u.id
        WHERE b.created_by = ?
      `;

      const banners = await this.query(sql, [userId]);
      return banners.map((banner) => new Banner(banner));
    } catch (error) {
      console.error("Find banners by created_by error:", error);
      throw error;
    }
  }
}

module.exports = Banner;
