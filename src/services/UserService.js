const ApiError = require("../exceptions/ApiError");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const cloudinary = require("../config/cloudinary");
const Banner = require("../models/Banner");

class UserService {
  async createUser(userData) {
    // Check phone number before create user
    if (!userData.phone_number) {
      throw new ApiError(400, "Phone number is required");
    }

    if (!/^[0-9]{10}$/.test(userData.phone_number)) {
      throw new ApiError(400, "Phone number is invalid. Please enter 10 digits");
    }

    if (await User.isEmailTaken(userData.email)) {
      // Delete both avatar and pet_photo if exists
      if (userData.avatar && !userData.avatar.includes("default-avatar")) {
        try {
          const urlParts = userData.avatar.split("/");
          const publicId = `avatars/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting avatar on Cloudinary:", deleteError);
        }
      }

      if (userData.pet_photo) {
        try {
          const urlParts = userData.pet_photo.split("/");
          const publicId = `pets/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error(
            "Error deleting pet photo on Cloudinary:",
            deleteError
          );
        }
      }
      throw new ApiError(400, "Email already used");
    }

    // If there is password, hash password
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }

    // Handle avatar
    const defaultAvatar = "default-avatar.png";
    if (!userData.avatar) {
      userData.avatar = defaultAvatar;
    }

    // Ensure is_active = true
    userData.is_active = true;

    try {
      return await User.create(userData);
    } catch (error) {
      // Delete both avatar and pet_photo if there is an error
      if (userData.avatar && !userData.avatar.includes("default-avatar")) {
        try {
          const urlParts = userData.avatar.split("/");
          const publicId = `avatars/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting avatar on Cloudinary:", deleteError);
        }
      }

      if (userData.pet_photo) {
        try {
          const urlParts = userData.pet_photo.split("/");
          const publicId = `pets/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error(
            "Error deleting pet photo on Cloudinary:",
            deleteError
          );
        }
      }
      throw error;
    }
  }

  async getUsers(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const users = await User.findAll(filters, { offset, limit });
    const total = await User.count(filters);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id) {
    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    return user;
  }

  async updateUser(id, updateData) {
    try {
      const user = await this.getUserById(id);

      // Convert string boolean to actual boolean
      if (updateData.is_active !== undefined) {
        updateData.is_active = updateData.is_active === 'true' || updateData.is_active === true ? 1 : 0;
      }

      if (updateData.is_locked !== undefined) {
        updateData.is_locked = updateData.is_locked === 'true' || updateData.is_locked === true ? 1 : 0;
      }

      if (updateData.is_deleted !== undefined) {
        updateData.is_deleted = updateData.is_deleted === 'true' || updateData.is_deleted === true ? 1 : 0;
      }

      if(updateData.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(updateData.password, salt);
      }

      // Remove empty password
      if (updateData.password === '') {
        delete updateData.password;
      }

      const updatedUser = await User.update(id, updateData);

      return updatedUser;
    } catch (error) {
      console.error('Update User Error:', error);
      throw error;
    }
  }

  async toggleDelete(id, currentUser) {
    try {
      const userToDelete = await this.getUserById(id);

      // Check delete permission
      if (userToDelete.role === "ADMIN") {
        // Check if it's not self-delete account
        if (currentUser.id === parseInt(id)) {
          throw new ApiError(403, "Cannot delete your own ADMIN account");
        }

        // Check admin count
        const adminCount = await User.countAdmins();
        if(userToDelete.is_deleted === 1) {
          if (adminCount <= 2) {
            throw new ApiError(
              400,
              "Cannot delete ADMIN account when there are only 2 ADMIN in the system"
            );
          }
        }
      }

      const updateData = {
        is_deleted: !userToDelete.is_deleted,
      };

      return User.update(id, updateData);
    } catch (error) {
      console.error("Toggle delete user error:", error);
      throw error;
    }
  }

  async apsoluteDelete(id, currentUser) {
    try {
      const userToDelete = await this.getUserById(id);

      // Check delete permission
      // If it's not self-delete account
      if (userToDelete.role == "ADMIN") {
        if (currentUser.id === parseInt(id)) {
          throw new ApiError(403, "Cannot delete your own ADMIN account");
        }
        // Check admin count
        const adminCount = await User.countAdmins();
        if (adminCount <= 2) {
          throw new ApiError(
            400,
            "Cannot delete ADMIN account when there are only 2 ADMIN in the system"
          );
        }
      }

      // Check user relations before delete
      const relations = await User.checkUserRelations(id);

      // 1. Update created_by to null for all banners of user
      const userBanners = await Banner.findByCreatedBy(id);
      for (const banner of userBanners) {
        await Banner.update(banner.id, { created_by: null });
      }

      // 2. Delete avatar and pet_photo on Cloudinary if exists
      if (
        userToDelete.avatar &&
        !userToDelete.avatar.includes("default-avatar") &&
        !userToDelete.avatar.startsWith("https://lh3.googleusercontent.com")
      ) {
        try {
          const urlParts = userToDelete.avatar.split("/");
          const publicId = `avatars/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting avatar on Cloudinary:", deleteError);
        }
      }

      if (
        userToDelete.pet_photo &&
        !userToDelete.pet_photo.startsWith("https://lh3.googleusercontent.com")
      ) {
        try {
          const urlParts = userToDelete.pet_photo.split("/");
          const publicId = `pets/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting pet photo on Cloudinary:", deleteError);
        }
      }

      // 3. Delete user relations
      await User.deleteUserRelations(id);

      // 4. Delete user
      await User.hardDelete(id);
    } catch (error) {
      console.error("Delete user error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Error deleting user: " + error.message);
    }
  }

  async toggleUserStatus(id, action, currentUser) {
    try {
      const userToUpdate = await this.getUserById(id);
      const updateData = {};

      // Check update permission
      if (userToUpdate.role === "ADMIN") {
        // Check if it's not self-update account
        if (currentUser.id !== parseInt(id)) {
          throw new ApiError(403, "Cannot change status of other ADMIN account");
        }

        // Check admin count
        const adminCount = await User.countAdmins();
        if (adminCount <= 2) {
          throw new ApiError(
            400,
            "Cannot change status of ADMIN account when there are only 2 ADMIN in the system"
          );
        }
      }

      // Update status
      if (action === "lock") {
        updateData.is_locked = !userToUpdate.is_locked;
      } else if (action === "activate") {
        updateData.is_active = !userToUpdate.is_active;
      }

      return User.update(id, updateData);
    } catch (error) {
      console.error("Toggle user status error:", error);
      throw error;
    }
  }

  async validateUserData(data) {
    const errors = [];

    // Validate mật khẩu
    if (!data.password) {
      errors.push("Password is required");
    } else if (data.password.length < 6) {
      errors.push("Password must be at least 6 characters");
    } else if (!/[A-Z]/.test(data.password)) {
      errors.push("Password must contain at least 1 uppercase letter");
    } else if (!/[0-9]/.test(data.password)) {
      errors.push("Password must contain at least 1 number");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Invalid data", errors);
    }
  }

  async updateProfile(userId, updateData) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Validate update data
    if (updateData.full_name && updateData.full_name.trim().length < 2) {
      throw new ApiError(400, "Full name must be at least 2 characters");
    }

    if (
      updateData.phone_number &&
      !/^[0-9]{10}$/.test(updateData.phone_number)
    ) {
      throw new ApiError(400, "Invalid phone number format");
    }

    try {
      // Handle old avatar deletion on Cloudinary
      if (
        updateData.avatar &&
        user.avatar &&
        !user.avatar.includes("default-avatar") &&
        !user.avatar.startsWith("https://lh3.googleusercontent.com")
      ) {
        try {
          const urlParts = user.avatar.split("/");
          const publicId = `avatars/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error("Error deleting old avatar:", error);
        }
      }

      // Handle old pet_photo deletion on Cloudinary
      if (
        updateData.pet_photo &&
        user.pet_photo &&
        !user.pet_photo.startsWith("https://lh3.googleusercontent.com")
      ) {
        try {
          const urlParts = user.pet_photo.split("/");
          const publicId = `pets/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error("Error deleting old pet photo:", error);
        }
      }

      // Update user information
      const updatedUser = await User.update(userId, updateData);
      return updatedUser;
    } catch (error) {
      // If update fails, delete new image (if any)
      if (updateData.avatar && updateData.avatar !== user.avatar) {
        try {
          const urlParts = updateData.avatar.split("/");
          const publicId = `avatars/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting new avatar:", deleteError);
        }
      }

      if (updateData.pet_photo && updateData.pet_photo !== user.pet_photo) {
        try {
          const urlParts = updateData.pet_photo.split("/");
          const publicId = `pets/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting new pet photo:", deleteError);
        }
      }
      throw error;
    }
  }

  async getDeletedUsers(filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    // Ensure only fetching soft-deleted users
    const deletedFilters = {
      ...filters,
      is_deleted: 1
    };

    const users = await User.findAllDeleted(deletedFilters, { offset, limit });
    const total = await User.countDeleted(deletedFilters);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserByEmail(email) {
    const user = await User.findByEmail(email);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    return user;
  }
}

module.exports = new UserService();
