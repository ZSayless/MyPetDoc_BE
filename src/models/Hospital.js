const BaseModel = require("./BaseModel");
const convertBitToBoolean = require("../utils/convertBitToBoolean");
const cloudinary = require("../config/cloudinary");
const slugify = require("../utils/slugify");
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
    try {
      // Chuẩn bị dữ liệu
      const hospitalData = {
        name: data.name || null,
        slug: slugify(data.name),
        address: data.address || null,
        department: data.department || null,
        phone: data.phone || null,
        email: data.email || null,
        link_website: data.link_website || null,
        operating_hours: data.operating_hours || null,
        specialties: data.specialties || null,
        staff_description: data.staff_description || null,
        staff_credentials: data.staff_credentials || null,
        map_location: data.map_location || null,
        description: data.description || null,
        created_by: data.created_by || null,
      };

      // Log để debug
      // console.log("Hospital Data:", hospitalData);

      const sql = `
        INSERT INTO hospitals 
        (name, slug, address, department, phone, email, 
         link_website, operating_hours, specialties, 
         staff_description, staff_credentials, map_location, 
         description, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        hospitalData.name,
        hospitalData.slug,
        hospitalData.address,
        hospitalData.department,
        hospitalData.phone,
        hospitalData.email,
        hospitalData.link_website,
        hospitalData.operating_hours,
        hospitalData.specialties,
        hospitalData.staff_description,
        hospitalData.staff_credentials,
        hospitalData.map_location,
        hospitalData.description,
        hospitalData.created_by,
      ];

      // Log để debug
      // console.log("SQL:", sql);
      // console.log("Params:", params);

      const result = await this.query(sql, params);
      return result;
    } catch (error) {
      console.error("Create Hospital Error:", error);
      throw error;
    }
  }
  static async update(id, data) {
    // Convert boolean to bit before update
    if (data.is_deleted !== undefined) {
      data.is_deleted = data.is_deleted ? 1 : 0;
    }
    if (data.slug !== undefined) {
      data.slug = slugify(data.name);
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
  static async findBySlug(slug) {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE slug = ? AND is_deleted = 0
    `;
    const [result] = await this.query(sql, [slug]);
    return result ? new Hospital(result) : null;
  }
  // Thêm phương thức getHospitalBySlug
  static async getHospitalBySlug(slug) {
    try {
      const sql = `
        SELECT h.*, 
               COUNT(DISTINCT r.id) as review_count,
               AVG(r.rating) as average_rating,
               GROUP_CONCAT(DISTINCT CONCAT(
                 hi.id, '::::', 
                 hi.image_url, '::::', 
                 hi.created_at, '::::', 
                 (SELECT COUNT(*) FROM hospital_image_likes hil WHERE hil.image_id = hi.id)
               )) as images
        FROM ${this.tableName} h
        LEFT JOIN reviews r ON h.id = r.hospital_id AND r.is_deleted = 0
        LEFT JOIN hospital_images hi ON h.id = hi.hospital_id
        WHERE h.slug = ? AND h.is_deleted = 0
        GROUP BY h.id, h.created_at, h.updated_at, h.is_deleted, h.is_active, 
                 h.version, h.address, h.phone, h.slug, h.email, h.link_website,
                 h.map_location, h.description, h.name, h.department, h.operating_hours,
                 h.specialties, h.staff_description, h.staff_credentials, h.created_by
      `;

      const [result] = await this.query(sql, [slug]);

      if (!result) return null;

      // Chuyển đổi string images thành array với cả id, url, createdAt và likesCount
      if (result.images) {
        result.images = result.images.split(',').map(img => {
          const [id, url, createdAt, likesCount] = img.split('::::');
          return {
            id: parseInt(id),
            url: url,
            createdAt: createdAt,
            likesCount: parseInt(likesCount) || 0
          };
        });
      } else {
        result.images = [];
      }

      // Làm tròn average_rating
      if (result.average_rating) {
        result.average_rating = parseFloat(result.average_rating.toFixed(1));
      }

      return new Hospital(result);
    } catch (error) {
      console.error("Get hospital by slug error:", error);
      throw error;
    }
  }
}

module.exports = Hospital;
