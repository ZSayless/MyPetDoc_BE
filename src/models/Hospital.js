const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");
const cloudinary = require("../config/cloudinary");
const Review = require("./Review");

class Hospital extends BaseModel {
  static tableName = "hospitals";
  // Constructor to convert data
  constructor(data) {
    super();
    if (data) {
      Object.assign(this, {
        ...data,
        is_deleted: convertBitToBoolean(data.is_deleted),
      });
    }
  }
  // Search method
  static async search(searchParams = {}, options = {}) {
    try {
      // Ensure searchParams is not undefined
      searchParams = searchParams || {};
      options = options || {};
      const {
        offset = 0,
        limit = 10,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = options;
      // Only get valid parameters
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
      // Process search parameters
      Object.entries(validSearchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          conditions.push(`${key} LIKE ?`);
          params.push(`%${value}%`);
        }
      });
      // Create query with search conditions
      const sql = `
       SELECT * FROM ${this.tableName}
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
     `;
      const hospitals = await this.query(sql, params);
      // Count total results
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
  // Count search results
  static async countSearch(searchParams = {}) {
    try {
      // Ensure searchParams is not undefined
      searchParams = searchParams || {};
      // Only get valid parameters
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
      // Process search parameters
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
  // Check if name is taken
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
  // Override basic methods
  static async findOne(conditions) {
    const hospitalData = await super.findOne(conditions);
    if (!hospitalData) return null;
    return new Hospital(hospitalData);
  }
  static async findById(id) {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE id = ?
    `;
    const [result] = await this.query(sql, [id]);
    return result ? new Hospital(result) : null;
  }

  static async create(data) {
    const sql = `
      INSERT INTO ${this.tableName} 
      (name, address, department ,phone ,email ,link_website, operating_hours, specialties, staff_description, staff_credentials, map_location, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.name,
      data.address,
      data.department,
      data.phone,
      data.email,
      data.link_website,
      data.operating_hours,
      data.specialties,
      data.staff_description,
      data.staff_credentials,
      data.map_location,
      data.description,
      data.created_by,
    ];

    const result = await this.query(sql, params);
    return result; // Return insert result to get insertId
  }
  static async update(id, data) {
    // Convert boolean to bit before update
    if (data.is_deleted !== undefined) {
      data.is_deleted = data.is_deleted ? 1 : 0;
    }
    const hospitalData = await super.update(id, data);
    return new Hospital(hospitalData);
  }
  static async findAll(filters = {}, options = {}) {
    const hospitals = await super.findAll(filters, options);
    return hospitals.map((hospitalData) => new Hospital(hospitalData));
  }
  // Soft delete method
  static async softDelete(id) {
    await this.update(id, { is_deleted: true });
  }
  // Hard delete method
  static async hardDelete(id) {
    try {
      // 1. Delete all report_reasons related to reviews of hospital
      await this.query(
        `
        DELETE rr FROM report_reasons rr
        INNER JOIN reviews r ON rr.review_id = r.id
        WHERE r.hospital_id = ?
      `,
        [id]
      );

      // 2. Delete all reviews of hospital
      await this.query(
        `
        DELETE FROM reviews 
        WHERE hospital_id = ?
      `,
        [id]
      );

      // 3. Delete all images of hospital
      const images = await this.query(
        "SELECT image_url FROM hospital_images WHERE hospital_id = ?",
        [id]
      );

      // Delete images on Cloudinary
      if (images && images.length > 0) {
        for (const image of images) {
          if (image.image_url) {
            try {
              const urlParts = image.image_url.split("/");
              const filename = urlParts[urlParts.length - 1].split(".")[0];
              const publicId = `hospitals/${filename}`;

              await cloudinary.uploader.destroy(publicId);
              console.log(`Deleted image on Cloudinary: ${publicId}`);
            } catch (cloudinaryError) {
              console.error(
                "Error deleting image on Cloudinary:",
                cloudinaryError
              );
            }
          }
        }
      }

      // 4. Delete images in hospital_images table
      await this.query("DELETE FROM hospital_images WHERE hospital_id = ?", [
        id,
      ]);

      // 5. Finally delete hospital record
      await this.query("DELETE FROM hospitals WHERE id = ?", [id]);

      return true;
    } catch (error) {
      console.error("Error in Hospital.hardDelete:", error);
      throw error;
    }
  }
}

module.exports = Hospital;
