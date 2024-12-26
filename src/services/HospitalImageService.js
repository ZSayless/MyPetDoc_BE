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

  async deleteImage(imageId, userId) {
    const image = await HospitalImage.findById(imageId);
    if (!image) {
      throw new ApiError(404, "Không tìm thấy ảnh");
    }

    // Xóa file
    if (fs.existsSync(image.image_url)) {
      fs.unlinkSync(image.image_url);
    }

    // Xóa record trong database
    await HospitalImage.delete(imageId);
    return true;
  }

  async getHospitalImages(hospitalId) {
    return await HospitalImage.findByHospitalId(hospitalId);
  }
}

module.exports = new HospitalImageService();
