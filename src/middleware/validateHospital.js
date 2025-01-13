const Hospital = require("../models/Hospital");
const ApiError = require("../exceptions/ApiError");
const cloudinary = require("../config/cloudinary");

const validateHospitalOwnership = async (req, res, next) => {
  try {
    const hospitalId = req.params.id;
    const userId = req.user.id;

    // Bỏ qua kiểm tra nếu là ADMIN
    if (req.user.role === "ADMIN") {
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        // Xóa ảnh đã upload nếu có
        if (req.files && req.files.length > 0) {
          for (const file of req.files) {
            try {
              const publicId = file.filename.split("/").pop().split(".")[0];
              await cloudinary.uploader.destroy(`hospitals/${publicId}`);
            } catch (error) {
              console.error("Lỗi khi xóa ảnh:", error);
            }
          }
        }
        throw new ApiError(404, "Không tìm thấy bệnh viện");
      }
      req.hospital = hospital;
      return next();
    }

    // Kiểm tra quyền sở hữu
    const hospital = await Hospital.findById(hospitalId);

    if (!hospital) {
      // Xóa ảnh đã upload nếu có
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            const publicId = file.filename.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`hospitals/${publicId}`);
            console.log("Đã xóa ảnh:", publicId);
          } catch (error) {
            console.error("Lỗi khi xóa ảnh:", error);
          }
        }
      }
      throw new ApiError(404, "Không tìm thấy bệnh viện");
    }

    if (hospital.created_by !== userId) {
      // Xóa ảnh đã upload nếu không có quyền
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            const publicId = file.filename.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`hospitals/${publicId}`);
            console.log("Đã xóa ảnh:", publicId);
          } catch (error) {
            console.error("Lỗi khi xóa ảnh:", error);
          }
        }
      }
      throw new ApiError(403, "Bạn không có quyền cập nhật bệnh viện này");
    }

    // Lưu hospital vào request để sử dụng sau
    req.hospital = hospital;
    next();
  } catch (error) {
    // Đảm bảo xóa ảnh trong mọi trường hợp lỗi
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const publicId = file.filename.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`hospitals/${publicId}`);
          console.log("Đã xóa ảnh:", publicId);
        } catch (deleteError) {
          console.error("Lỗi khi xóa ảnh:", deleteError);
        }
      }
    }
    next(error);
  }
};

const validateHospital = async (req, res, next) => {
  try {
    const hospitalId = req.params.id;
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(404, "Không tìm thấy bệnh viện");
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { validateHospitalOwnership, validateHospital };
