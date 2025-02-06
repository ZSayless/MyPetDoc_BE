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

       // Convert bit fields to boolean for each hospital
    const convertedHospitals = hospitals.map(hospital => ({
      ...hospital,
      is_active: convertBitToBoolean(hospital.is_active),
      is_deleted: convertBitToBoolean(hospital.is_deleted),
      is_verified: convertBitToBoolean(hospital.is_verified)
    }));

      const total = countResult.total;
      return {
        data: convertedHospitals,
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
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE id = ?
      `;
      
      const [hospital] = await this.query(sql, [id]);
      
      if (!hospital) return null;

      // Convert bit fields to boolean
      return {
        ...hospital,
        is_active: convertBitToBoolean(hospital.is_active),
        is_deleted: convertBitToBoolean(hospital.is_deleted)
      };
    } catch (error) {
      console.error("Find hospital by id error:", error);
      throw error;
    }
  }

  static async create(data) {
    try {
      // Prepare data
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

      // Log for debug
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

      // Log for debug
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
    try {
      // Convert boolean to bit before update
      if (data.is_active !== undefined) {
        data.is_active = data.is_active ? 1 : 0;
      }
      if (data.is_deleted !== undefined) {
        data.is_deleted = data.is_deleted ? 1 : 0;
      }

      const updateFields = Object.keys(data)
        .map((key) => `${key} = ?`)
        .join(", ");

      const sql = `
        UPDATE ${this.tableName}
        SET ${updateFields}
        WHERE id = ?
      `;

      const values = [...Object.values(data), id];
      await this.query(sql, values);

      return this.findById(id);
    } catch (error) {
      console.error("Update hospital error:", error);
      throw error;
    }
  }
  static async findAll(filters = {}, options = {}) {
    try {
      const { offset = 0, limit = 10 } = options;
      const entries = Object.entries(filters);
      const where = entries.length > 0
        ? entries.map(([key]) => `${key} = ?`).join(" AND ")
        : "1=1";
      const values = entries.map(([_, value]) => value);

      const sql = `
        SELECT * FROM ${this.tableName} 
        WHERE ${where}
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;

      const hospitals = await this.query(sql, values);

      // Convert bit fields to boolean for each hospital
      return hospitals.map(hospital => ({
        ...hospital,
        is_active: convertBitToBoolean(hospital.is_active),
        is_deleted: convertBitToBoolean(hospital.is_deleted)
      }));
    } catch (error) {
      console.error("Find all hospitals error:", error);
      throw error;
    }
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
  // Add method getHospitalBySlug
  static async getHospitalBySlug(slug) {
    try {
      const sql = `
        SELECT h.*, 
               COUNT(DISTINCT r.id) as review_count,
               CAST(AVG(r.rating) AS DECIMAL(10,1)) as average_rating,
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
        GROUP BY h.id
      `;

      const [result] = await this.query(sql, [slug]);

      if (!result) return null;

      // Convert string images to array with full information
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

      // Process average_rating
      if (result.average_rating !== null) {
        result.average_rating = parseFloat(result.average_rating);
      }

      return new Hospital(result);
    } catch (error) {
      console.error("Get hospital by slug error:", error);
      throw error;
    }
  }
}

module.exports = Hospital;
