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
        // console.log("Processing file:", file);

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
      // If there is an error, delete the uploaded images on Cloudinary
      for (const file of files) {
        if (file.path) {
          const publicId = `hospitals/${file.filename}`;
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (deleteError) {
            console.error("Error deleting image on Cloudinary:", deleteError);
          }
        }
      }
      throw error;
    }
  }

  async deleteImage(imageId, hospitalId) {
    try {
      // Find image by id
      let image;
      if (typeof imageId === "string") {
        image = await HospitalImage.findOne({ image_url: imageId });
      } else {
        image = await HospitalImage.findById(imageId);
      }

      if (!image) {
        throw new ApiError(404, "Image not found");
      }

      // Convert to number for comparison
      const imageHospitalId = parseInt(image.hospital_id);
      const targetHospitalId = parseInt(hospitalId);

      // Compare after converting data type
      if (imageHospitalId !== targetHospitalId) {
        // console.log(
        //   "Image hospital ID:",
        //   imageHospitalId,
        //   "Target hospital ID:",
        //   targetHospitalId
        // );
        throw new ApiError(
          403,
          "Cannot delete image not belong to this hospital"
        );
      }

      // Delete image on Cloudinary
      if (image.image_url) {
        const urlParts = image.image_url.split("/");
        const publicId = `hospitals/${
          urlParts[urlParts.length - 1].split(".")[0]
        }`;

        try {
          await cloudinary.uploader.destroy(publicId);
          // console.log(`Deleted image: ${publicId}`);
        } catch (deleteError) {
          console.error("Error deleting image on Cloudinary:", deleteError);
        }
      }

      // Delete record in database
      await HospitalImage.delete(image.id);
      return true;
    } catch (error) {
      console.error("Error deleting image:", error);
      throw error;
    }
  }

  async getHospitalImages(hospitalId) {
    try {
      const images = await HospitalImage.findByHospitalId(hospitalId);
      return images.map((image) => ({
        id: image.id,
        url: image.image_url,
        createdAt: image.created_at,
        likesCount: parseInt(image.likes_count) || 0
      }));
    } catch (error) {
      console.error("Error getting hospital images:", error);
      throw error;
    }
  }

  async toggleLike(imageId, userId) {
    try {
      // Kiểm tra ảnh có tồn tại
      const image = await HospitalImage.findById(imageId);
      if (!image) {
        throw new ApiError(404, "Image not found");
      }

      // Kiểm tra xem user đã like chưa
      const hasLiked = await HospitalImage.hasUserLiked(imageId, userId);

      if (hasLiked) {
        // Unlike
        await HospitalImage.removeLike(imageId, userId);
        return {
          message: "Unliked image successfully",
          hasLiked: false
        };
      } else {
        // Like
        await HospitalImage.addLike(imageId, userId);
        return {
          message: "Liked image successfully", 
          hasLiked: true
        };
      }
    } catch (error) {
      console.error("Toggle like error:", error);
      throw error;
    }
  }

  async checkUserLikedImage(imageId, userId) {
    try {
      const hasLiked = await HospitalImage.hasUserLiked(imageId, userId);
      return {
        hasLiked
      };
    } catch (error) {
      console.error("Check user liked image error:", error);
      throw error;
    }
  }
}

module.exports = new HospitalImageService();
