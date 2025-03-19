const ApiError = require("../exceptions/ApiError");
const Hospital = require("../models/Hospital");
const hospitalImageService = require("./HospitalImageService");
const cloudinary = require("../config/cloudinary");
const User = require("../models/User");
const HospitalImage = require("../models/HospitalImage");
const Review = require("../models/Review");
const convertBitToBoolean = require("../utils/convertBitToBoolean");

class HospitalService {
  async createHospital(hospitalData, userId, files = []) {
    try {
      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError(404, "Không tìm thấy người dùng");
      }

      // Check user's role and conditions for creating a hospital
      if (user.role === "HOSPITAL_ADMIN") {
        // Check if hospital admin already has a hospital
        if (user.hospital_id) {
          throw new ApiError(
            403,
            "Hospital Admin can only create one hospital"
          );
        }

        // Set is_active = false for hospital created by HOSPITAL_ADMIN
        hospitalData.is_active = 0;
      } else if (user.role === "ADMIN") {
        // ADMIN can create hospital with is_active = true
        hospitalData.is_active = 1;
      } else {
        throw new ApiError(403, "No permission to create hospital");
      }

      // Check if hospital name is taken
      if (await Hospital.isNameTaken(hospitalData.name)) {
        throw new ApiError(400, "Hospital name already exists");
      }

      // Add creator's information
      hospitalData.created_by = userId;

      // Create hospital
      const result = await Hospital.create(hospitalData);
      const hospitalId = result.insertId;

      if (!hospitalId) {
        throw new ApiError(500, "Cannot create hospital");
      }

      // If user is HOSPITAL_ADMIN, update hospital_id for user
      if (user.role === "HOSPITAL_ADMIN") {
        await User.update(userId, { hospital_id: hospitalId });
      }

      // Process images if any
      let images = [];
      if (files && files.length > 0) {
        try {
          images = await hospitalImageService.addImages(
            hospitalId,
            files,
            userId
          );
        } catch (imageError) {
          // If there is an error when adding images, rollback all changes
          await Hospital.hardDelete(hospitalId);
          if (user.role === "HOSPITAL_ADMIN") {
            await User.update(userId, { hospital_id: null });
          }
          throw imageError;
        }
      }

      // Get hospital information with images
      const hospitalWithImages = await Hospital.findById(hospitalId);
      if (!hospitalWithImages) {
        throw new ApiError(404, "Hospital not found after creation");
      }

      return {
        ...hospitalWithImages,
        images: images || [],
      };
    } catch (error) {
      // Process image deletion if there is an error
      if (files && files.length > 0) {
        for (const file of files) {
          if (file.path) {
            const urlParts = file.path.split("/");
            const publicId = `hospitals/${
              urlParts[urlParts.length - 1].split(".")[0]
            }`;
            try {
              await cloudinary.uploader.destroy(publicId);
            } catch (deleteError) {
              console.error("Error deleting image:", deleteError);
            }
          }
        }
      }
      console.error("Error in createHospital:", error);
      throw error;
    }
  }

  async updateHospital(
    id,
    updateData,
    files = [],
    imagesToDelete = [],
    userId
  ) {
    try {
      const hospital = await this.getHospitalById(id);

      if (updateData.name && updateData.name !== hospital.name) {
        if (await Hospital.isNameTaken(updateData.name, id)) {
          throw new ApiError(400, "Hospital name already exists");
        }
      }

      // Delete old images if requested
      if (imagesToDelete && imagesToDelete.length > 0) {
        for (const imageId of imagesToDelete) {
          try {
            await hospitalImageService.deleteImage(imageId, id);
          } catch (error) {
            console.error(`Error deleting image ${imageId}:`, error);
          }
        }
      }

      // Add new images if any
      let newImages = [];
      if (files && files.length > 0) {
        try {
          newImages = await hospitalImageService.addImages(id, files, userId);
        } catch (imageError) {
          console.error("Error adding new images:", imageError);
          throw imageError;
        }
      }

      // Update hospital information
      const updatedHospital = await Hospital.update(id, updateData);

      // Get latest hospital information with images
      const hospitalWithImages = await this.getHospitalById(id);
      return hospitalWithImages;
    } catch (error) {
      // If there is an error and new images have been uploaded, delete new images
      if (files && files.length > 0) {
        for (const file of files) {
          if (file.path) {
            const urlParts = file.path.split("/");
            const publicId = `hospitals/${
              urlParts[urlParts.length - 1].split(".")[0]
            }`;
            try {
              await cloudinary.uploader.destroy(publicId);
            } catch (deleteError) {
              console.error("Error deleting new image:", deleteError);
            }
          }
        }
      }
      console.error("Error in updateHospital:", error);
      throw error;
    }
  }

  async toggleDelete(id) {
    try {
      const hospital = await this.getHospitalById(id);
      if (!hospital) {
        throw new ApiError(404, "Hospital not found");
      }

      const updateData = {
        is_deleted: !hospital.is_deleted,
      };

      await Hospital.update(id, updateData);
      return await this.getHospitalById(id);
    } catch (error) {
      throw error;
    }
  }

  async getHospitals(filters = {}, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const hospitals = await Hospital.findAll(filters, { offset, limit });
      const total = await Hospital.count(filters);

      // Get additional data for each hospital
      const hospitalsWithData = await Promise.all(
        hospitals.map(async (hospital) => {
          // Get review stats
          const stats = await Review.getHospitalStats(hospital.id);
          
          // Get images
          const images = await HospitalImage.findByHospitalId(hospital.id);
          
          return {
            ...hospital,
            stats,
            images: images.map(img => ({
              id: img.id,
              url: img.image_url,
              createdAt: img.created_at,
              likesCount: parseInt(img.likes_count) || 0
            }))
          };
        })
      );

      return {
        hospitals: hospitalsWithData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error("Get hospitals error:", error);
      throw error;
    }
  }

  async getHospitalById(id) {
    try {
      const hospital = await Hospital.findById(id);
      if (!hospital) {
        throw new ApiError(404, "Hospital not found");
      }

      // Get hospital images
      const images = await hospitalImageService.getHospitalImages(id);
      return {
        ...hospital,
        images: images || [],
      };
    } catch (error) {
      throw error;
    }
  }

  async searchHospitals(searchParams = {}, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const hospitals = await Hospital.search(searchParams, {
        offset,
        limit,
        sortBy: searchParams.sortBy || "created_at",
        sortOrder: searchParams.sortOrder || "DESC",
      });

      // Count total results
      const total = await Hospital.countSearch(searchParams);

      // Get images for each hospital
      const hospitalsWithImages = await Promise.all(
        hospitals.data.map(async (hospital) => {
          const images = await hospitalImageService.getHospitalImages(
            hospital.id
          );
          return {
            ...hospital,
            images: images || [],
          };
        })
      );

      // Get stats for each hospital
      const hospitalsWithStats = await Promise.all(
        hospitalsWithImages.map(async (hospital) => {
          const stats = await Review.getHospitalStats(hospital.id);
          return {
            ...hospital,
            stats
          };
        })
      );

      return {
        hospitals: hospitalsWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async validateHospitalData(data, isUpdate = false) {
    const errors = [];

    // Check hospital name
    if (!isUpdate || data.name) {
      if (!data.name || data.name.trim().length < 3) {
        errors.push("Hospital name must be at least 3 characters");
      }
    }

    if (data.phone) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(data.phone)) {
        errors.push("Invalid phone number");
      }
    }

    // Check address if any
    if (data.address && data.address.trim().length < 5) {
      errors.push("Address must be at least 5 characters");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Invalid data", errors);
    }
  }

  async hardDelete(id) {
    try {
      // Get hospital information before deleting
      const hospital = await Hospital.findById(id);
      if (!hospital) {
        throw new ApiError(404, "Hospital not found");
      }

      // Get hospital images before deleting
      const hospitalImages = await HospitalImage.findByHospitalId(id);

      // Delete images on Cloudinary
      if (hospitalImages && hospitalImages.length > 0) {
        for (const image of hospitalImages) {
          try {
            // Get public_id from URL
            const urlParts = image.image_url.split("/");
            const publicId = `hospitals/${
              urlParts[urlParts.length - 1].split(".")[0]
            }`;

            // Delete image on Cloudinary
            await cloudinary.uploader.destroy(publicId);
          } catch (cloudinaryError) {
            console.error(
              "Error deleting image on Cloudinary:",
              cloudinaryError
            );
            // Continue processing other images even if there is an error
          }
        }
      }

      // Get list of users related
      const users = await User.findByHospitalId(id);

      // Update hospital_id to null for each user
      if (users && users.length > 0) {
        for (const user of users) {
          await User.update(user.id, { hospital_id: null });
        }
      }

      // Perform hard delete
      await Hospital.hardDelete(id);

      return {
        status: "success",
        message: "Hospital deleted successfully",
      };
    } catch (error) {
      console.error("Error in HospitalService.hardDelete:", error);
      throw error;
    }
  }

  async getHospitalBySlug(slug) {
    try {
      const hospital = await Hospital.getHospitalBySlug(slug);

      if (!hospital) {
        throw new ApiError(404, "Cannot find hospital");
      }

      // check if hospital is deleted
      if (hospital.is_deleted) {
        throw new ApiError(404, "Hospital is deleted");
      }

      // Check if hospital is active
      if (!convertBitToBoolean(hospital.is_active)) {
        throw new ApiError(403, "Hospital is not active");
      }

      // Get more review information with user details
      const reviewsData = await Review.search(
        {
          hospital_id: hospital.id,
          is_deleted: 0,
        },
        {
          offset: 0,
          limit: 5,
          sortBy: "created_at",
          sortOrder: "DESC",
        }
      );

      // Get hospital stats
      const stats = await Review.getHospitalStats(hospital.id);

      return {
        ...hospital,
        stats: {
          total_reviews: stats.total_reviews,
          average_rating: parseFloat(stats.average_rating) || 0,
          rating_counts: {
            five_star: stats.five_star,
            four_star: stats.four_star,
            three_star: stats.three_star,
            two_star: stats.two_star,
            one_star: stats.one_star,
          }
        },
        recent_reviews: reviewsData.reviews || [],
      };
    } catch (error) {
      console.error("Get hospital by slug service error:", error);
      throw error;
    }
  }

  async toggleActive(id) {
    try {
      const hospital = await Hospital.findById(id);
      if (!hospital) {
        throw new ApiError(404, "Hospital not found");
      }

      // Check if there is a HOSPITAL_ADMIN managing the hospital
      const adminCount = await User.count({
        role: "HOSPITAL_ADMIN",
        hospital_id: id,
        is_active: 1,
        is_deleted: 0
      });

      const updateData = {
        is_active: hospital.is_active ? 0 : 1,
        updated_at: new Date()
      };

      return await Hospital.update(id, updateData);
    } catch (error) {
      console.error("Toggle hospital active error:", error);
      throw error;
    }
  }

  async getDeletedHospitals(filters = {}, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      // Đảm bảo chỉ lấy những hospital đã bị xóa mềm
      const deletedFilters = {
        ...filters,
        is_deleted: 1
      };

      const hospitals = await Hospital.findAllDeleted(deletedFilters, { offset, limit });
      const total = await Hospital.countDeleted(deletedFilters);

      // Get stats for each hospital
      const hospitalsWithStats = await Promise.all(
        hospitals.map(async (hospital) => {
          const stats = await Review.getHospitalStats(hospital.id);
          return {
            ...hospital,
            stats
          };
        })
      );

      return {
        hospitals: hospitalsWithStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Get deleted hospitals error:", error);
      throw error;
    }
  }

  async getHospitalsByCreator(creatorId) {
    try {
      // Check if user exists
      const user = await User.findById(creatorId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Get hospitals by creator
      const hospitals = await Hospital.findByCreatorId(creatorId);

      // Get images for each hospital
      const hospitalsWithImages = await Promise.all(
        hospitals.map(async (hospital) => {
          const images = await HospitalImage.findByHospitalId(hospital.id);
          return {
            ...hospital,
            images: images.map(img => ({
              id: img.id,
              url: img.image_url,
              createdAt: img.created_at,
              likesCount: parseInt(img.likes_count) || 0
            }))
          };
        })
      );

      return hospitalsWithImages;
    } catch (error) {
      console.error("Get hospitals by creator error:", error);
      throw error;
    }
  }

  async toggleProposal(id) {
    try {
      const hospital = await Hospital.findById(id);
      if (!hospital) {
        throw new ApiError(404, "Hospital not found");
      }

      // Sửa lại cách kiểm tra giá trị proposal hiện tại
      const updateData = {
        proposal: hospital.proposal ? 0 : 1,  // Đảo ngược giá trị bit
        updated_at: new Date()
      };

      return await Hospital.update(id, updateData);
    } catch (error) {
      console.error("Toggle hospital proposal error:", error);
      throw error;
    }
  }
}

module.exports = new HospitalService();
