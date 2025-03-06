const ApiError = require("../exceptions/ApiError");
const Pet = require("../models/Pet");
const cloudinary = require("../config/cloudinary");

class PetService {
  async createPet(petData) {
    try {
      // Validate dữ liệu đầu vào
      this.validatePetData(petData);

      // Tạo pet mới
      const pet = await Pet.create(petData);
      return pet;
    } catch (error) {
      // Nếu có lỗi và đã upload ảnh, xóa ảnh khỏi Cloudinary
      if (petData.photo) {
        try {
          const urlParts = petData.photo.split("/");
          const publicId = `pets/${urlParts[urlParts.length - 1].split(".")[0]}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting pet photo on Cloudinary:", deleteError);
        }
      }
      throw error instanceof ApiError 
        ? error 
        : new ApiError(500, "Error creating pet: " + error.message);
    }
  }

  async getPets(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const pets = await Pet.findAll(filters, { offset, limit });
    const total = await Pet.count(filters);

    return {
      pets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPetById(id) {
    const pet = await Pet.findById(id);
    if (!pet) {
      throw new ApiError(404, "Pet not found");
    }
    return pet;
  }

  async getUserPets(userId) {
    const pets = await Pet.findByUserId(userId);
    const total = await Pet.countByUserId(userId);

    return {
      pets,
      total,
    };
  }

  async updatePet(id, updateData) {
    try {
      // Kiểm tra pet tồn tại
      const pet = await this.getPetById(id);

      // Lọc và xử lý dữ liệu cập nhật
      const filteredData = {};
      
      // Chỉ cập nhật các trường có giá trị (không phải undefined hoặc null)
      if (updateData.type) {
        filteredData.type = updateData.type;
      }
      
      if (updateData.age !== undefined && updateData.age !== null) {
        filteredData.age = parseInt(updateData.age);
      }
      
      if (updateData.photo) {
        filteredData.photo = updateData.photo;
      }
      
      if (updateData.notes !== undefined && updateData.notes !== null) {
        filteredData.notes = updateData.notes;
      }

      // Kiểm tra có dữ liệu cập nhật không
      if (Object.keys(filteredData).length === 0) {
        return pet; // Trả về pet hiện tại nếu không có gì cập nhật
      }

      // Validate dữ liệu cập nhật
      this.validatePetData(filteredData, true);

      // Xử lý xóa ảnh cũ trên Cloudinary nếu có ảnh mới
      if (filteredData.photo && pet.photo) {
        try {
          const urlParts = pet.photo.split("/");
          const publicId = `pets/${urlParts[urlParts.length - 1].split(".")[0]}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error("Error deleting old pet photo:", error);
        }
      }

      // Sử dụng updateWithoutVersion thay vì update
      const updatedPet = await Pet.updateWithoutVersion(id, filteredData);
      return updatedPet;
    } catch (error) {
      // Xử lý cleanup nếu có lỗi
      if (updateData.photo && updateData.photo !== pet?.photo) {
        try {
          const urlParts = updateData.photo.split("/");
          const publicId = `pets/${urlParts[urlParts.length - 1].split(".")[0]}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting new pet photo:", deleteError);
        }
      }
      throw error instanceof ApiError 
        ? error 
        : new ApiError(500, "Error updating pet: " + error.message);
    }
  }

  async deletePet(id) {
    try {
      const pet = await this.getPetById(id);

      // Xóa ảnh trên Cloudinary nếu có
      if (pet.photo) {
        try {
          const urlParts = pet.photo.split("/");
          const publicId = `pets/${urlParts[urlParts.length - 1].split(".")[0]}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error("Error deleting pet photo:", error);
        }
      }

      // Xóa pet
      await Pet.hardDelete(id);
    } catch (error) {
      throw error instanceof ApiError 
        ? error 
        : new ApiError(500, "Error deleting pet: " + error.message);
    }
  }

  async softDeletePet(id) {
    try {
      await this.getPetById(id);
      await Pet.softDelete(id);
    } catch (error) {
      throw error instanceof ApiError 
        ? error 
        : new ApiError(500, "Error soft deleting pet: " + error.message);
    }
  }

  validatePetData(data, isUpdate = false) {
    const errors = [];

    // Bỏ qua validate user_id và type nếu là update
    if (!isUpdate) {
      if (!data.user_id) {
        errors.push("User ID is required");
      }

      if (!data.type) {
        errors.push("Pet type is required");
      }
    }

    // Validate type nếu được cung cấp
    if (data.type) {
      const validTypes = ['DOG', 'CAT', 'BIRD', 'RABBIT', 'FISH', 'HAMSTER', 'REPTILE', 'OTHER'];
      if (!validTypes.includes(data.type)) {
        errors.push("Invalid pet type");
      }
    }

    // Validate age nếu có
    if (data.age !== undefined) {
      const age = parseInt(data.age);
      if (isNaN(age) || age < 0) {
        errors.push("Age must be a positive integer");
      }
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Invalid data", errors);
    }
  }
}

module.exports = new PetService(); 