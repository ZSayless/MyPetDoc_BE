const HospitalService = require("../services/HospitalService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const HospitalImageService = require("../services/HospitalImageService");
const path = require("path");
const fs = require("fs");

class HospitalController {
  // Lấy danh sách bệnh viện với filter và phân trang
  getHospitals = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10, ...filters } = req.query;
    const result = await HospitalService.getHospitals(
      filters,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  });

  // Lấy chi tiết một bệnh viện
  getHospitalById = asyncHandler(async (req, res, next) => {
    const hospital = await HospitalService.getHospitalById(req.params.id);
    res.json(hospital);
  });

  // Tạo mới bệnh viện
  createHospital = asyncHandler(async (req, res, next) => {
    try {
      // Validate dữ liệu đầu vào
      await HospitalService.validateHospitalData(req.body);
      console.log("Creating hospital...");
      console.log("Request body:", req.body);
      console.log("Request files:", req.files);
      console.log("User:", req.user);

      const hospitalData = {
        ...req.body,
      };
      const userId = req.user.id;

      // Tạo bệnh viện và xử lý ảnh trong một lần gọi
      const result = await HospitalService.createHospital(
        hospitalData,
        userId,
        req.files || [] // Truyền files vào service
      );

      res.status(201).json({
        status: "success",
        message: "Tạo bệnh viện thành công",
        data: result,
      });
    } catch (error) {
      console.error("Error in createHospital controller:", error);
      // Xóa các file đã upload nếu có lỗi
      if (req.files) {
        req.files.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      next(error);
    }
  });

  // Cập nhật thông tin bệnh viện
  updateHospital = asyncHandler(async (req, res, next) => {
    try {
      // Validate dữ liệu cập nhật
      await HospitalService.validateHospitalData(req.body, true);

      // Tách riêng dữ liệu cập nhật và files
      const { images, ...updateData } = req.body;

      // Cập nhật thông tin bệnh viện (không bao gồm images)
      const hospital = await HospitalService.updateHospital(
        req.params.id,
        updateData
      );

      // Xử lý images nếu có
      if (req.files && req.files.length > 0) {
        await HospitalImageService.addImages(
          req.params.id,
          req.files,
          req.user.id
        );
      }

      // Lấy thông tin bệnh viện đã cập nhật kèm ảnh
      const updatedHospital = await HospitalService.getHospitalById(
        req.params.id
      );
      const images_id = await HospitalImageService.getHospitalImages(
        req.params.id
      );

      res.json({
        status: "success",
        message: "Cập nhật bệnh viện thành công",
        data: {
          ...updatedHospital,
          images_id,
        },
      });
    } catch (error) {
      // Xóa các file đã upload nếu có lỗi
      if (req.files) {
        req.files.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      next(error);
    }
  });

  // Xóa vĩnh viễn bệnh viện
  hardDelete = asyncHandler(async (req, res, next) => {
    await HospitalService.hardDelete(req.params.id);
    res.status(204).send();
  });

  // Toggle xóa mềm bệnh viện
  toggleDelete = asyncHandler(async (req, res, next) => {
    const hospital = await HospitalService.toggleDelete(req.params.id);
    res.json(hospital);
  });

  // Tìm kiếm bệnh viện nâng cao
  searchHospitals = asyncHandler(async (req, res, next) => {
    const {
      page = 1,
      limit = 10,
      sortBy,
      sortOrder,
      fromDate,
      toDate,
      ...searchParams
    } = req.query;

    const result = await HospitalService.searchHospitals(
      {
        ...searchParams,
        fromDate,
        toDate,
        sortBy,
        sortOrder,
      },
      parseInt(page),
      parseInt(limit)
    );

    res.json(result);
  });

  // Thêm ảnh cho bệnh viện
  async addImages(req, res, next) {
    try {
      const { hospitalId } = req.params;
      const userId = req.user.id;

      // Kiểm tra quyền (chỉ ADMIN hoặc HOSPITAL_ADMIN của bệnh viện đó)
      if (
        req.user.role !== "ADMIN" &&
        (req.user.role !== "HOSPITAL_ADMIN" ||
          req.user.hospital_id != hospitalId)
      ) {
        throw new ApiError(403, "Không có quyền thêm ảnh cho bệnh viện này");
      }

      if (!req.files || req.files.length === 0) {
        throw new ApiError(400, "Vui lòng chọn ít nhất 1 ảnh");
      }

      const images = await HospitalImageService.addImages(
        hospitalId,
        req.files,
        userId
      );

      res.json({
        status: "success",
        message: "Thêm ảnh thành công",
        data: images,
      });
    } catch (error) {
      next(error);
    }
  }

  // Xóa ảnh bệnh viện
  async deleteImage(req, res, next) {
    try {
      const { hospitalId, imageId } = req.params;
      const userId = req.user.id;

      // Kiểm tra quyền
      if (
        req.user.role !== "ADMIN" &&
        (req.user.role !== "HOSPITAL_ADMIN" ||
          req.user.hospital_id != hospitalId)
      ) {
        throw new ApiError(403, "Không có quyền xóa ảnh của bệnh viện này");
      }

      await HospitalImageService.deleteImage(imageId, userId);

      res.json({
        status: "success",
        message: "Xóa ảnh thành công",
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách ảnh của bệnh viện
  async getImages(req, res, next) {
    try {
      const { hospitalId } = req.params;
      const images = await HospitalImageService.getHospitalImages(hospitalId);

      res.json({
        status: "success",
        data: images,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HospitalController();
