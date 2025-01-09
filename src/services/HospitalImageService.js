const HospitalImage = require("../models/HospitalImage");
const ApiError = require("../exceptions/ApiError");
const cloudinary = require("../config/cloudinary");

class HospitalImageService {
  async addImages(hospitalId, files, userId) {
    try {
      // console.log("Adding images for hospital:", hospitalId);
      // console.log("Files:", files);
      // console.log("User ID:", userId);

      if (!hospitalId) {
        throw new ApiError(400, "hospital_id is required");
      }

      const images = [];
      for (const file of files) {
        console.log("Processing file:", file);

        const imageData = {
          hospital_id: hospitalId,
          image_url: file.path, // Cloudinary URL
          created_by: userId || null,
        };

        // console.log("Creating image with data:", imageData);
        const image = await HospitalImage.create(imageData);
        // console.log("Image created:", image);
        images.push(image);
      }
      return images;
    } catch (error) {
      // Nếu có lỗi, xóa các ảnh đã upload lên Cloudinary
      for (const file of files) {
        if (file.path) {
          const publicId = `hospitals/${file.filename}`;
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (deleteError) {
            console.error("Lỗi khi xóa ảnh trên Cloudinary:", deleteError);
          }
        }
      }
      throw error;
    }
  }

  async deleteImage(imageId, hospitalId) {
    try {
      // Tìm ảnh theo id
      let image;
      if (typeof imageId === "string") {
        image = await HospitalImage.findOne({ image_url: imageId });
      } else {
        image = await HospitalImage.findById(imageId);
      }

      if (!image) {
        throw new ApiError(404, "Không tìm thấy ảnh");
      }

      // Chuyển đổi sang number để so sánh
      const imageHospitalId = parseInt(image.hospital_id);
      const targetHospitalId = parseInt(hospitalId);

      // So sánh sau khi đã chuyển đổi kiểu dữ liệu
      if (imageHospitalId !== targetHospitalId) {
        console.log(
          "Image hospital ID:",
          imageHospitalId,
          "Target hospital ID:",
          targetHospitalId
        );
        throw new ApiError(
          403,
          "Không th� xóa ảnh không thuộc về bệnh viện này"
        );
      }

      // Xóa ảnh trên Cloudinary
      if (image.image_url) {
        const urlParts = image.image_url.split("/");
        const publicId = `hospitals/${
          urlParts[urlParts.length - 1].split(".")[0]
        }`;

        try {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Đã xóa ảnh: ${publicId}`);
        } catch (deleteError) {
          console.error("Lỗi khi xóa ảnh trên Cloudinary:", deleteError);
        }
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
        url: image.image_url, // URL Cloudinary
        createdAt: image.created_at,
      }));
    } catch (error) {
      console.error("Error getting hospital images:", error);
      throw error;
    }
  }
}

module.exports = new HospitalImageService();
