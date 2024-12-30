const HospitalImage = require("../models/HospitalImage");
const ApiError = require("../exceptions/ApiError");
const fs = require("fs");
const path = require("path");

class HospitalImageService {
  async addImages(hospitalId, files, userId) {
    try {
      console.log("Adding images for hospital:", hospitalId);
      console.log("Files:", files);
      console.log("User ID:", userId);

      if (!hospitalId) {
        throw new ApiError(400, "hospital_id is required");
      }

      const images = [];
      for (const file of files) {
        console.log("Processing file:", file);

        const imageData = {
          hospital_id: hospitalId,
          image_url: path.basename(file.path),
          created_by: userId || null,
        };

        console.log("Creating image with data:", imageData);
        const image = await HospitalImage.create(imageData);
        console.log("Image created:", image);
        images.push(image);
      }
      return images;
    } catch (error) {
      console.error("Error in addImages:", error);
      // Xóa các file đã upload nếu có lỗi
      files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      throw error;
    }
  }

  async deleteImage(imageId) {
    try {
      // Nếu imageId là string (tên file), tìm bằng image_url
      let image;
      if (typeof imageId === "string") {
        image = await HospitalImage.findOne({ image_url: imageId });
      } else {
        // Nếu là số, tìm bằng id
        image = await HospitalImage.findById(imageId);
      }

      if (!image) {
        throw new ApiError(404, "Không tìm thấy ảnh");
      }

      // Tạo đường dẫn đầy đủ đến file ảnh
      const imagePath = path.join(
        __dirname,
        "../../uploads/hospitals",
        image.image_url
      );
      console.log("Deleting image at path:", imagePath);

      // Kiểm tra và xóa file
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log("Đã xóa file ảnh thành công");
      } else {
        console.log("File ảnh không tồn tại:", imagePath);
      }

      // Xóa record trong database
      await HospitalImage.delete(image.id);
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa ảnh:", error);
      throw error;
    }
  }

  async getHospitalImages(hospitalId) {
    try {
      const images = await HospitalImage.findByHospitalId(hospitalId);
      return images.map((image) => ({
        id: image.id,
        url: image.image_url,
        fullUrl: `/uploads/hospitals/${image.image_url}`, // URL đầy đủ để hiển thị ảnh
        createdAt: image.created_at,
      }));
    } catch (error) {
      console.error("Error getting hospital images:", error);
      throw error;
    }
  }
}

module.exports = new HospitalImageService();
