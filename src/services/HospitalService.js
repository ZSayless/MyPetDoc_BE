const ApiError = require("../exceptions/ApiError");
const Hospital = require("../models/Hospital");
const hospitalImageService = require("./HospitalImageService");
const cloudinary = require("../config/cloudinary");
const User = require("../models/User");
const HospitalImage = require("../models/HospitalImage");

class HospitalService {
  async createHospital(hospitalData, userId, files = []) {
    try {
      // Kiểm tra user
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError(404, "Không tìm thấy người dùng");
      }

      // Kiểm tra quyền và điều kiện tạo bệnh viện
      if (user.role === "HOSPITAL_ADMIN") {
        // Kiểm tra xem hospital admin đã có bệnh viện chưa
        if (user.hospital_id) {
          throw new ApiError(403, "Hospital Admin chỉ được tạo một bệnh viện");
        }

        // Set is_active = false cho bệnh viện do HOSPITAL_ADMIN tạo
        hospitalData.is_active = 0;
      } else if (user.role === "ADMIN") {
        // ADMIN có thể tạo bệnh viện với is_active = true
        hospitalData.is_active = 1;
      } else {
        throw new ApiError(403, "Không có quyền tạo bệnh viện");
      }

      // Kiểm tra tên bệnh viện
      if (await Hospital.isNameTaken(hospitalData.name)) {
        throw new ApiError(400, "Tên bệnh viện đã tồn tại");
      }

      // Thêm thông tin người tạo
      hospitalData.created_by = userId;

      // Tạo bệnh viện
      const result = await Hospital.create(hospitalData);
      const hospitalId = result.insertId;

      if (!hospitalId) {
        throw new ApiError(500, "Không thể tạo bệnh viện");
      }

      // Nếu là HOSPITAL_ADMIN, cập nhật hospital_id cho user
      if (user.role === "HOSPITAL_ADMIN") {
        await User.update(userId, { hospital_id: hospitalId });
      }

      // Xử lý images nếu có
      let images = [];
      if (files && files.length > 0) {
        try {
          images = await hospitalImageService.addImages(
            hospitalId,
            files,
            userId
          );
        } catch (imageError) {
          // Nếu lỗi khi thêm ảnh, rollback tất cả thay đổi
          await Hospital.hardDelete(hospitalId);
          if (user.role === "HOSPITAL_ADMIN") {
            await User.update(userId, { hospital_id: null });
          }
          throw imageError;
        }
      }

      // Lấy thông tin bệnh viện kèm ảnh
      const hospitalWithImages = await Hospital.findById(hospitalId);
      if (!hospitalWithImages) {
        throw new ApiError(404, "Không tìm thấy bệnh viện sau khi tạo");
      }

      return {
        ...hospitalWithImages,
        images: images || [],
      };
    } catch (error) {
      // Xử lý xóa ảnh nếu có lỗi
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
              console.error("Lỗi khi xóa ảnh:", deleteError);
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
          throw new ApiError(400, "Tên bệnh viện đã tồn tại");
        }
      }

      // Xóa các ảnh cũ nếu có yêu cầu
      if (imagesToDelete && imagesToDelete.length > 0) {
        for (const imageId of imagesToDelete) {
          try {
            await hospitalImageService.deleteImage(imageId, id);
          } catch (error) {
            console.error(`Error deleting image ${imageId}:`, error);
          }
        }
      }

      // Thêm ảnh mới nếu có
      let newImages = [];
      if (files && files.length > 0) {
        try {
          newImages = await hospitalImageService.addImages(id, files, userId);
        } catch (imageError) {
          console.error("Error adding new images:", imageError);
          throw imageError;
        }
      }

      // Cập nhật thông tin bệnh viện
      const updatedHospital = await Hospital.update(id, updateData);

      // Lấy thông tin mới nhất kèm ảnh
      const hospitalWithImages = await this.getHospitalById(id);
      return hospitalWithImages;
    } catch (error) {
      // Nếu có lỗi và đã upload ảnh mới, xóa các ảnh mới
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
              console.error("Lỗi khi xóa ảnh mới:", deleteError);
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
        throw new ApiError(404, "Không tìm thấy bệnh viện");
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

  async getHospitals(searchParams = {}, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const {
        name,
        address,
        department,
        specialties,
        fromDate,
        toDate,
        ...otherFilters
      } = searchParams;

      // Tìm kiếm bệnh viện với các điều kiện
      const hospitals = await Hospital.search(
        {
          name,
          address,
          department,
          specialties,
          fromDate,
          toDate,
          ...otherFilters,
        },
        { offset, limit }
      );

      // Đếm tổng số kết quả
      const total = await Hospital.countSearch({
        name,
        address,
        department,
        specialties,
        fromDate,
        toDate,
        ...otherFilters,
      });

      // Lấy ảnh cho từng bệnh viện
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

      return {
        hospitals: hospitalsWithImages,
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

  async getHospitalById(id) {
    try {
      const hospital = await Hospital.findById(id);
      if (!hospital) {
        throw new ApiError(404, "Không tìm thấy bệnh viện");
      }

      // Lấy ảnh của bệnh viện
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

      // Đếm tổng số kết quả
      const total = await Hospital.countSearch(searchParams);

      // Lấy ảnh cho từng bệnh viện
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

      return {
        hospitals: hospitalsWithImages,
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

    // Kiểm tra tên bệnh viện
    if (!isUpdate || data.name) {
      if (!data.name || data.name.trim().length < 3) {
        errors.push("Tên bệnh viện phải có ít nhất 3 ký tự");
      }
    }

    if (data.phone) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(data.phone)) {
        errors.push("Số điện thoại không hợp lệ");
      }
    }

    // Kiểm tra địa chỉ nếu có
    if (data.address && data.address.trim().length < 5) {
      errors.push("Địa chỉ phải có ít nhất 5 ký tự");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Dữ liệu không hợp lệ", errors);
    }
  }

  async hardDelete(id) {
    try {
      // Lấy thông tin hospital trước khi xóa
      const hospital = await Hospital.findById(id);
      if (!hospital) {
        throw new ApiError(404, "Không tìm thấy bệnh viện");
      }

      // Lấy danh sách ảnh của hospital
      const hospitalImages = await HospitalImage.findByHospitalId(id);

      // Xóa ảnh trên Cloudinary
      if (hospitalImages && hospitalImages.length > 0) {
        for (const image of hospitalImages) {
          try {
            // Lấy public_id từ URL
            const urlParts = image.image_url.split("/");
            const publicId = `hospitals/${
              urlParts[urlParts.length - 1].split(".")[0]
            }`;

            // Xóa ảnh trên Cloudinary
            await cloudinary.uploader.destroy(publicId);
          } catch (cloudinaryError) {
            console.error("Lỗi khi xóa ảnh trên Cloudinary:", cloudinaryError);
            // Tiếp tục xử lý các ảnh khác ngay cả khi có lỗi
          }
        }
      }

      // Lấy danh sách users liên quan
      const users = await User.findByHospitalId(id);

      // Cập nhật hospital_id thành null cho từng user
      if (users && users.length > 0) {
        for (const user of users) {
          await User.update(user.id, { hospital_id: null });
        }
      }

      // Thực hiện xóa cứng
      await Hospital.hardDelete(id);

      return {
        status: "success",
        message: "Đã xóa bệnh viện thành công",
      };
    } catch (error) {
      console.error("Error in HospitalService.hardDelete:", error);
      throw error;
    }
  }
}

module.exports = new HospitalService();
