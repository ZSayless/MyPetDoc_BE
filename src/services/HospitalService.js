const ApiError = require("../exceptions/ApiError");
const Hospital = require("../models/Hospital");
const hospitalImageService = require("./HospitalImageService");
const HospitalImage = require("../models/HospitalImage");
const fs = require("fs");
const path = require("path");

class HospitalService {
  async createHospital(hospitalData, userId, files = []) {
    try {
      // console.log("Creating hospital with data:", hospitalData);
      // console.log("User ID:", userId);

      // Kiểm tra tên bệnh viện đã tồn tại chưa
      if (await Hospital.isNameTaken(hospitalData.name)) {
        throw new ApiError(400, "Tên bệnh viện đã tồn tại");
      }

      // Thêm thông tin người tạo
      hospitalData.created_by = userId;

      // console.log("Data to create:", hospitalData);

      // Tạo bệnh viện
      const result = await Hospital.create(hospitalData);
      // console.log("Hospital creation result:", result);

      // Lấy ID của bệnh viện vừa tạo
      const hospitalId = result.insertId;
      // console.log("New hospital ID:", hospitalId);

      if (!hospitalId) {
        throw new ApiError(500, "Không thể tạo bệnh viện");
      }

      // Xử lý images nếu có
      let images = [];
      if (files && files.length > 0) {
        console.log("Processing images for hospital ID:", hospitalId);
        try {
          images = await hospitalImageService.addImages(
            hospitalId,
            files,
            userId
          );
          console.log("Images added:", images);
        } catch (imageError) {
          console.error("Error adding images:", imageError);
          // Nếu lỗi khi thêm ảnh, vẫn trả về bệnh viện nhưng không có ảnh
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
      console.error("Error in createHospital:", error);
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

  async updateHospital(
    id,
    updateData,
    files = [],
    imagesToDelete = [],
    userId
  ) {
    try {
      const hospital = await this.getHospitalById(id);

      // Kiểm tra nếu cập nhật tên
      if (updateData.name && updateData.name !== hospital.name) {
        if (await Hospital.isNameTaken(updateData.name, id)) {
          throw new ApiError(400, "Tên bệnh viện đã tồn tại");
        }
      }

      // Xóa các ảnh cũ nếu có yêu cầu
      if (imagesToDelete && imagesToDelete.length > 0) {
        console.log("Deleting old images:", imagesToDelete);
        for (const imageId of imagesToDelete) {
          try {
            await hospitalImageService.deleteImage(imageId, id);
            console.log(`Deleted image ${imageId} successfully`);
          } catch (error) {
            console.error(`Error deleting image ${imageId}:`, error);
          }
        }
      }

      // Xử lý thêm ảnh mới nếu có
      let newImages = [];
      if (files && files.length > 0) {
        try {
          console.log("Adding new images for hospital:", id);
          newImages = await hospitalImageService.addImages(id, files, userId);
          console.log("New images added:", newImages);
        } catch (imageError) {
          console.error("Error adding new images:", imageError);
          // Nếu có lỗi khi thêm ảnh mới, vẫn tiếp tục cập nhật thông tin bệnh viện
        }
      }

      // Cập nhật thông tin bệnh viện
      const updatedHospital = await Hospital.update(id, updateData);

      // Lấy thông tin mới nhất kèm ảnh
      const hospitalWithImages = await this.getHospitalById(id);
      return hospitalWithImages;
    } catch (error) {
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

      // Đơn giản hóa logic chuyển đổi
      const updateData = {
        is_deleted: !hospital.is_deleted,
      };

      // Cập nhật trạng thái is_deleted
      await Hospital.update(id, updateData);

      // Lấy và trả về thông tin mới nhất của bệnh viện
      return await this.getHospitalById(id);
    } catch (error) {
      throw error;
    }
  }

  async hardDelete(id) {
    try {
      // Lấy danh sách ảnh của bệnh viện trước khi xóa
      const images = await HospitalImage.findByHospitalId(id);

      // Xóa các file ảnh vật lý
      for (const image of images) {
        const imagePath = path.join(
          __dirname,
          "../../uploads/hospitals",
          image.image_url
        );

        // Kiểm tra và xóa file
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log(`Deleted file: ${imagePath}`);
        }
      }

      // Xóa bệnh viện (cascade sẽ tự động xóa các records trong hospital_images)
      await Hospital.hardDelete(id);

      return {
        status: "success",
        message: "Đã xóa vĩnh viễn bệnh viện và các ảnh liên quan",
      };
    } catch (error) {
      console.error("Error in hardDelete hospital:", error);
      throw error;
    }
  }

  async searchHospitals(searchParams = {}, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      // Tìm kiếm bệnh viện
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

    // Kiểm tra số điện thoại nếu có
    if (data.contact) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(data.contact)) {
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
}

module.exports = new HospitalService();
