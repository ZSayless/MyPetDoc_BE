const UserService = require("../services/UserService");
const PetService = require("../services/PetService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary");
const cache = require("../config/redis");
const { promisify } = require('util');

class UserController {
  // Method to clear user cache
  clearUserCache = async (userId = null) => {
    try {
      // Get all keys matching the pattern
      const pattern = "cache:/api/users*";
      const keys = await cache.keys(pattern);

      // Delete each found key
      if (keys.length > 0) {
        await Promise.all(keys.map(key => cache.del(key)));
      }

      // Clear specific user's cache if provided
      if (userId) {
        await Promise.all([
          cache.del(`cache:/api/users/${userId}`),
          cache.del(`cache:/api/users/${userId}/profile`),
          cache.del(`cache:/api/users/${userId}/stats`),
          cache.del(`cache:/api/users/${userId}?*`),
          cache.del(`cache:/api/users/${userId}/profile?*`),
          cache.del(`cache:/api/users/${userId}/stats?*`),
          cache.del(`cache:/api/users/by-email?*`)
        ]);
      }

      // Clear role-specific caches
      await Promise.all([
        cache.del('cache:/api/users/admins'),
        cache.del('cache:/api/users/moderators'),
        cache.del('cache:/api/users/general-users'),
        cache.del('cache:/api/users/admins?*'),
        cache.del('cache:/api/users/moderators?*'),
        cache.del('cache:/api/users/general-users?*')
      ]);

    } catch (error) {
      console.error("Error clearing user cache:", error);
    }
  };

  // Method to clear deleted users cache
  clearDeletedUsersCache = async () => {
    try {
      const pattern = "cache:/api/users/deleted*";
      const keys = await cache.keys(pattern);

      if (keys.length > 0) {
        await Promise.all(keys.map(key => cache.del(key)));
      }

      console.log("Cleared deleted users cache:", keys.length, "keys");
    } catch (error) {
      console.error("Error clearing deleted users cache:", error);
    }
  };

  getUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, ...filters } = req.query;
    const result = await UserService.getUsers(
      filters,
      parseInt(page),
      parseInt(limit)
    );
    res.json({
      status: "success",
      message: "Get users successful",
      data: result,
    });
  });

  getUserById = asyncHandler(async (req, res) => {
    const user = await UserService.getUserById(req.params.id);
    res.json(user);
  });

  createUser = asyncHandler(async (req, res) => {
    const userData = {
      ...req.body,
      is_active: true,
    };

    // Handle avatar from uploadedFiles
    if (req.uploadedFiles?.avatar) {
      userData.avatar = req.uploadedFiles.avatar.path;
    }

    // Tạo user trước
    const user = await UserService.createUser(userData);
    delete user.password;

    // Nếu có thông tin về pet, tạo pet mới
    if (userData.pet_type) {
      const petData = {
        user_id: user.id,
        type: userData.pet_type,
        age: userData.pet_age,
        notes: userData.pet_notes,
        photo: req.uploadedFiles?.pet_photo?.path
      };

      try {
        await PetService.createPet(petData);
      } catch (error) {
        console.error("Error creating pet:", error);
        // Không throw error vì user đã được tạo thành công
      }
    }

    // Clear cache after creating new user
    await this.clearUserCache();

    res.status(201).json({
      status: "success",
      message: "Create user successful",
      data: user,
    });
  });

  updateUser = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    let updateData = {};
    const allowedFields = [
      "full_name",
      "email",
      "password",
      "role",
      "phone_number",
      "is_active",
      "is_locked"
    ];

    // Chỉ lấy những trường được gửi đi và được phép cập nhật
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Handle avatar from uploadedFiles
    if (req.uploadedFiles?.avatar) {
      // Lấy thông tin user hiện tại để có URL ảnh cũ
      const currentUser = await UserService.getUserById(userId);
      if (currentUser.avatar) {
        // Xóa ảnh avatar cũ
        const urlParts = currentUser.avatar.split("/");
        const publicId = `avatars/${urlParts[urlParts.length - 1].split(".")[0]}`;
        await cloudinary.uploader.destroy(publicId);
      }
      updateData.avatar = req.uploadedFiles.avatar.path;
    }

    let user = null;
    // Chỉ update user nếu có dữ liệu cập nhật
    if (Object.keys(updateData).length > 0) {
      user = await UserService.updateUser(userId, updateData);
    }

    // Xử lý thông tin pet
    if (req.body.pet_id || req.body.pet_type || req.body.pet_age || req.body.pet_notes || req.uploadedFiles?.pet_photo) {
      try {
        const petData = {
          user_id: userId,
        };

        if (req.body.pet_type) {
          petData.type = req.body.pet_type;
        }
        
        if (req.body.pet_age !== undefined && req.body.pet_age !== null) {
          petData.age = parseInt(req.body.pet_age);
        }
        
        if (req.body.pet_notes !== undefined && req.body.pet_notes !== null) {
          petData.notes = req.body.pet_notes;
        }

        if (req.uploadedFiles?.pet_photo) {
          if (req.body.pet_id) {
            // Nếu đang cập nhật pet, xóa ảnh cũ
            const existingPet = await PetService.getPetById(req.body.pet_id);
            if (existingPet.photo) {
              const urlParts = existingPet.photo.split("/");
              const publicId = `pets/${urlParts[urlParts.length - 1].split(".")[0]}`;
              await cloudinary.uploader.destroy(publicId);
            }
          }
          petData.photo = req.uploadedFiles.pet_photo.path;
        }

        if (req.body.pet_id) {
          await PetService.updatePet(req.body.pet_id, petData);
        } else {
          // Kiểm tra số lượng pet hiện tại
          const userPets = await PetService.getUserPets(userId);
          if (userPets.total >= 10) {
            throw new ApiError(400, "User can only have maximum 10 pets");
          }
          await PetService.createPet(petData);
        }
      } catch (error) {
        console.error("Error updating/creating pet:", error);
        throw new ApiError(500, "Error updating/creating pet: " + error.message);
      }
    }

    // Throw error nếu không có dữ liệu nào được cập nhật
    if (Object.keys(updateData).length === 0 && !req.body.pet_id && !req.body.pet_type && !req.body.pet_age && !req.body.pet_notes && !req.uploadedFiles?.pet_photo) {
      throw new ApiError(400, "No data to update");
    }

    // Clear cache after updating
    await this.clearUserCache(userId);

    // Lấy lại thông tin user sau khi cập nhật
    const updatedUser = await UserService.getUserById(userId);
    delete updatedUser.password;

    res.json({
      status: "success",
      message: "Update user successful",
      data: updatedUser,
    });
  });

  apsoluteDelete = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const currentUser = req.user;

    // Get user's pets first
    const userPets = await PetService.getUserPets(userId);
    
    // Delete all pets of the user
    for (const pet of userPets.pets) {
      try {
        await PetService.deletePet(pet.id);
      } catch (error) {
        console.error(`Error deleting pet ${pet.id}:`, error);
      }
    }

    // Delete user
    await UserService.apsoluteDelete(userId, currentUser);

    // Clear cache after hard delete
    await this.clearUserCache(userId);

    res.json({
      status: "success",
      message: "Delete user successful",
    });
  });

  toggleDelete = asyncHandler(async (req, res) => {
    const user = await UserService.toggleDelete(req.params.id, req.user);

    // Clear cache after toggling delete status
    await this.clearUserCache(req.params.id);

    res.json({
      status: "success",
      message: user.is_deleted
        ? "Soft delete user successful"
        : "Restore user successful",
      data: user,
    });
  });

  toggleLock = asyncHandler(async (req, res) => {
    const user = await UserService.toggleUserStatus(req.params.id, "lock", req.user);

    // Clear cache after changing status
    await this.clearUserCache(req.params.id);

    res.json({
      status: "success",
      message: user.is_locked
        ? "Lock user successful"
        : "Unlock user successful",
      data: user,
    });
  });

  toggleActive = asyncHandler(async (req, res) => {
    const user = await UserService.toggleUserStatus(
      req.params.id,
      "activate",
      req.user
    );

    // Clear cache after changing status
    await this.clearUserCache(req.params.id);

    res.json({
      status: "success",
      message: user.is_active
        ? "Activate user successful"
        : "Deactivate user successful",
      data: user,
    });
  });

  updateProfile = asyncHandler(async (req, res) => {
    try {
      if (req.body.id && parseInt(req.body.id) !== req.user.id) {
        throw new ApiError(403, "You are not allowed to update other user's profile");
      }

      // Basic user fields update
      const baseFields = ["full_name", "phone_number"];
      const updateData = {};

      baseFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      // Xử lý avatar
      if (req.uploadedFiles?.avatar) {
        updateData.avatar = req.uploadedFiles.avatar.path;
      } else if (req.body.avatar && req.body.avatar.startsWith("https://")) {
        updateData.avatar = req.body.avatar;
      }

      // Kiểm tra xem có dữ liệu cập nhật cho user không
      if (Object.keys(updateData).length > 0) {
        // Update user profile
        const user = await UserService.updateProfile(req.user.id, updateData);
        delete user.password;
      }

      // Xử lý thông tin pet
      if (req.body.pet_id || req.body.pet_type || req.body.pet_age || req.body.pet_notes || req.uploadedFiles?.pet_photo) {
        try {
          const petData = {
            user_id: req.user.id,
          };

          // Thêm các trường tùy chọn
          if (req.body.pet_type) {
            petData.type = req.body.pet_type;
          }
          
          if (req.body.pet_age !== undefined && req.body.pet_age !== null) {
            petData.age = parseInt(req.body.pet_age);
          }
          
          if (req.body.pet_notes !== undefined && req.body.pet_notes !== null) {
            petData.notes = req.body.pet_notes;
          }

          // Thêm ảnh pet nếu có
          if (req.uploadedFiles?.pet_photo) {
            petData.photo = req.uploadedFiles.pet_photo.path;
          }

          if (req.body.pet_id) {
            // Kiểm tra quyền sở hữu pet
            const existingPet = await PetService.getPetById(req.body.pet_id);
            if (existingPet.user_id !== req.user.id) {
              throw new ApiError(403, "You don't have permission to update this pet");
            }
            // Cập nhật pet hiện có
            await PetService.updatePet(req.body.pet_id, petData);
          } else {
            // Kiểm tra số lượng pet hiện tại
            const userPets = await PetService.getUserPets(req.user.id);
            if (userPets.total >= 10) {
              throw new ApiError(400, "You can only have maximum 10 pets");
            }
            // Tạo pet mới
            await PetService.createPet(petData);
          }
        } catch (error) {
          console.error("Error updating/creating pet:", error);
          throw new ApiError(500, "Error updating/creating pet: " + error.message);
        }
      }

      // Lấy lại thông tin user sau khi cập nhật
      const updatedUser = await UserService.getUserById(req.user.id);
      delete updatedUser.password;

      // Clear cache
      await this.clearUserCache(req.user.id);

      res.json({
        status: "success",
        message: "Update profile successful",
        data: updatedUser,
      });
    } catch (error) {
      // Xử lý cleanup files khi có lỗi
      if (req.uploadedFiles) {
        try {
          if (req.uploadedFiles.avatar) {
            const urlParts = req.uploadedFiles.avatar.path.split("/");
            const publicId = `avatars/${urlParts[urlParts.length - 1].split(".")[0]}`;
            await cloudinary.uploader.destroy(publicId);
          }

          if (req.uploadedFiles.pet_photo) {
            const urlParts = req.uploadedFiles.pet_photo.path.split("/");
            const publicId = `pets/${urlParts[urlParts.length - 1].split(".")[0]}`;
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (deleteError) {
          console.error("Error deleting uploaded files:", deleteError);
        }
      }
      throw error;
    }
  });

  getDeletedUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, ...filters } = req.query;
    const result = await UserService.getDeletedUsers(
      filters,
      parseInt(page),
      parseInt(limit)
    );
    res.json({
      status: "success",
      message: "Get deleted users successful",
      data: result,
    });
  });

  getUserByEmail = asyncHandler(async (req, res) => {
    const { email } = req.query;
    
    if (!email) {
      throw new ApiError(400, "Email is required");
    }

    if (email !== req.user.email && req.user.role !== 'ADMIN') {
      throw new ApiError(403, "You are not allowed to view this email");
    }

    const user = await UserService.getUserByEmail(email);
    delete user.password;

    res.json({
      status: "success", 
      message: "Get user by email successful",
      data: user
    });
  });

  createPet = asyncHandler(async (req, res) => {
    try {
      // Kiểm tra số lượng pet hiện tại
      const userPets = await PetService.getUserPets(req.user.id);
      if (userPets.total >= 10) {
        throw new ApiError(400, "You can only have maximum 10 pets");
      }

      const petData = {
        user_id: req.user.id,
        type: req.body.pet_type || 'OTHER',
      };

      // Thêm các trường tùy chọn
      if (req.body.pet_age !== undefined && req.body.pet_age !== null) {
        petData.age = parseInt(req.body.pet_age);
      }
      
      if (req.body.pet_notes !== undefined && req.body.pet_notes !== null) {
        petData.notes = req.body.pet_notes;
      }

      // Thêm ảnh pet nếu có
      if (req.uploadedFiles?.pet_photo) {
        petData.photo = req.uploadedFiles.pet_photo.path;
      }

      // Tạo pet mới
      const newPet = await PetService.createPet(petData);

      res.status(201).json({
        status: "success",
        message: "Create pet successful",
        data: newPet
      });

      // Clear cache after creating new pet
      await this.clearUserCache(req.user.id);

    } catch (error) {
      // Xử lý cleanup ảnh nếu có lỗi
      if (req.uploadedFiles?.pet_photo) {
        try {
          const urlParts = req.uploadedFiles.pet_photo.path.split("/");
          const publicId = `pets/${urlParts[urlParts.length - 1].split(".")[0]}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting pet photo:", deleteError);
        }
      }
      throw error;
    }
  });

  deletePet = asyncHandler(async (req, res) => {
    const { petId } = req.params;
    
    // Kiểm tra quyền sở hữu pet
    const pet = await PetService.getPetById(petId);
    if (!pet) {
      throw new ApiError(404, "Pet not found");
    }
    
    if (pet.user_id !== req.user.id) {
      throw new ApiError(403, "You don't have permission to delete this pet");
    }

    // Xóa cứng pet
    await PetService.deletePet(petId);

    // Clear cache after deleting pet
    await this.clearUserCache(req.user.id);

    res.json({
      status: "success",
      message: "Delete pet successful"
    });
  });
}

module.exports = new UserController();
