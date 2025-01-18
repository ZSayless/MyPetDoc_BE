const HospitalService = require("../services/HospitalService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const HospitalImageService = require("../services/HospitalImageService");
const fs = require("fs");

class HospitalController {
  // Get list of hospitals with filter and pagination
  getHospitals = asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10, ...filters } = req.query;
    const result = await HospitalService.getHospitals(
      filters,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  });

  // Get details of a hospital
  getHospitalById = asyncHandler(async (req, res, next) => {
    const hospital = await HospitalService.getHospitalById(req.params.id);
    res.json(hospital);
  });

  // Create new hospital
  createHospital = asyncHandler(async (req, res, next) => {
    try {
      // Validate input data
      await HospitalService.validateHospitalData(req.body);

      // Prepare hospital data
      const hospitalData = {
        ...req.body,
      };

      // Create hospital and handle images in one call
      const result = await HospitalService.createHospital(
        hospitalData,
        req.user.id,
        req.files || [] // Pass files to service
      );

      res.status(201).json({
        status: "success",
        message: "Tạo bệnh viện thành công",
        data: result,
      });
    } catch (error) {
      console.error("Error in createHospital controller:", error);
      // Delete uploaded files if there is an error
      if (req.files) {
        req.files.forEach((file) => {
          if (fs.existsSync(file.path)) {
            try {
              fs.unlinkSync(file.path);
            } catch (unlinkError) {
              console.error(`Lỗi khi xóa file ${file.path}:`, unlinkError);
            }
          }
        });
      }
      next(error);
    }
  });

  // Update hospital information
  updateHospital = asyncHandler(async (req, res, next) => {
    try {
      // Validate update data
      await HospitalService.validateHospitalData(req.body, true);

      // Parse imageIdsToDelete from string JSON to array
      let imageIdsToDelete = [];
      if (req.body.imageIdsToDelete) {
        try {
          imageIdsToDelete = JSON.parse(req.body.imageIdsToDelete);
        } catch (error) {
          console.error("Error parsing imageIdsToDelete:", error);
          throw new ApiError(
            400,
            "Định dạng danh sách ảnh cần xóa không hợp lệ"
          );
        }
      }

      // Remove imageIdsToDelete from update data
      const { imageIdsToDelete: removed, ...updateData } = req.body;

      // Update hospital information
      const updatedHospital = await HospitalService.updateHospital(
        req.params.id,
        updateData,
        req.files || [], // New images
        imageIdsToDelete,
        req.user.id
      );

      res.json({
        status: "success",
        message: "Cập nhật bệnh viện thành công",
        data: updatedHospital,
      });
    } catch (error) {
      // Nếu có lỗi và đã upload files, xóa files
      if (req.files) {
        for (const file of req.files) {
          try {
            await cloudinary.uploader.destroy(file.filename);
          } catch (deleteError) {
            console.error("Lỗi khi xóa ảnh:", deleteError);
          }
        }
      }
      throw error;
    }
  });

  // Hard delete hospital
  hardDelete = asyncHandler(async (req, res, next) => {
    const result = await HospitalService.hardDelete(req.params.id);
    res.status(200).json(result);
  });

  // Toggle soft delete hospital
  toggleDelete = asyncHandler(async (req, res, next) => {
    const hospital = await HospitalService.toggleDelete(req.params.id);
    res.json(hospital);
  });

  // Advanced search hospitals
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

  // Add images to hospital
  async addImages(req, res, next) {
    try {
      const { hospitalId } = req.params;
      const userId = req.user.id;

      // Check permission (only ADMIN or HOSPITAL_ADMIN of the hospital)
      if (
        req.user.role !== "ADMIN" &&
        (req.user.role !== "HOSPITAL_ADMIN" ||
          req.user.hospital_id != hospitalId)
      ) {
        throw new ApiError(
          403,
          "You are not allowed to add images to this hospital"
        );
      }

      if (!req.files || req.files.length === 0) {
        throw new ApiError(400, "Please select at least 1 image");
      }

      const images = await HospitalImageService.addImages(
        hospitalId,
        req.files,
        userId
      );

      res.json({
        status: "success",
        message: "Add images successful",
        data: images,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete hospital image
  async deleteImage(req, res, next) {
    try {
      const { hospitalId, imageId } = req.params;
      const userId = req.user.id;

      // Check permission
      if (
        req.user.role !== "ADMIN" &&
        (req.user.role !== "HOSPITAL_ADMIN" ||
          req.user.hospital_id != hospitalId)
      ) {
        throw new ApiError(
          403,
          "You are not allowed to delete this hospital's image"
        );
      }

      await HospitalImageService.deleteImage(imageId, userId);

      res.json({
        status: "success",
        message: "Delete image successful",
      });
    } catch (error) {
      next(error);
    }
  }

  // Get list of hospital images
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

  // Get hospital by slug
  getHospitalBySlug = asyncHandler(async (req, res, next) => {
    const hospital = await HospitalService.getHospitalBySlug(req.params.slug);
    res.json(hospital);
  });
}

module.exports = new HospitalController();
