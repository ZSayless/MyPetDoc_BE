const UserService = require("../services/UserService");
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
          cache.del(`cache:/api/users/${userId}/stats?*`)
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

    // Handle pet_photo if role is GENERAL_USER or has pet information
    if (
      (userData.role === "GENERAL_USER" || userData.pet_type) &&
      req.uploadedFiles?.pet_photo
    ) {
      userData.pet_photo = req.uploadedFiles.pet_photo.path;
    }

    const user = await UserService.createUser(userData);
    delete user.password;

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
      "pet_type",
      "pet_age",
      "pet_notes",
      "is_active",
      "is_locked"
    ];


    // Chỉ lấy những trường được gửi đi và được phép cập nhật
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {  // Bỏ điều kiện !== ""
        updateData[field] = req.body[field];
      }
    });

    // Handle avatar from uploadedFiles
    if (req.uploadedFiles?.avatar) {
      updateData.avatar = req.uploadedFiles.avatar.path;
    }

    // Handle pet_photo if role is GENERAL_USER
    if (updateData.role === "GENERAL_USER" && req.uploadedFiles?.pet_photo) {
      updateData.pet_photo = req.uploadedFiles.pet_photo.path;
    }


    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, "No data to update");
    }

    const user = await UserService.updateUser(userId, updateData);

    // Clear cache after updating
    await this.clearUserCache(userId);

    res.json({
      status: "success",
      message: "Update user successful",
      data: user,
    });
  });

  apsoluteDelete = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const currentUser = req.user;

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
      // check user try to update other user
      if (req.body.id && parseInt(req.body.id) !== req.user.id) {
        throw new ApiError(
          403,
          "You are not allowed to update other user's profile"
        );
      }

      // Basic fields that any user can update
      const baseFields = ["full_name", "phone_number"];
      const updateData = {};

      // Update basic fields
      baseFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      // Handle avatar from uploadedFiles or URL
      if (req.uploadedFiles?.avatar) {
        updateData.avatar = req.uploadedFiles.avatar.path;
      } else if (req.body.avatar && req.body.avatar.startsWith("https://")) {
        updateData.avatar = req.body.avatar;
      }

      // Allow updating pet information regardless of role
      const petFields = ["pet_type", "pet_age", "pet_notes"];
      petFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      // Handle pet_photo from uploadedFiles or URL
      if (req.uploadedFiles?.pet_photo) {
        updateData.pet_photo = req.uploadedFiles.pet_photo.path;
      } else if (
        req.body.pet_photo &&
        req.body.pet_photo.startsWith("https://")
      ) {
        updateData.pet_photo = req.body.pet_photo;
      }

      // Check if there is data to update
      if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, "No data to update");
      }

      const user = await UserService.updateProfile(req.user.id, updateData);
      delete user.password;

      // Clear cache after updating profile
      await this.clearUserCache(req.user.id);

      res.json({
        status: "success",
        message: "Update profile successful",
        data: user,
      });
    } catch (error) {
      // If there is an error and there is an uploaded image, delete the image on Cloudinary
      if (req.uploadedFiles) {
        try {
          if (req.uploadedFiles.avatar) {
            const urlParts = req.uploadedFiles.avatar.path.split("/");
            const publicId = `avatars/${
              urlParts[urlParts.length - 1].split(".")[0]
            }`;
            await cloudinary.uploader.destroy(publicId);
            console.log("Deleted new avatar due to error:", publicId);
          }

          if (req.uploadedFiles.pet_photo) {
            const urlParts = req.uploadedFiles.pet_photo.path.split("/");
            const publicId = `pets/${
              urlParts[urlParts.length - 1].split(".")[0]
            }`;
            await cloudinary.uploader.destroy(publicId);
            console.log("Deleted new pet photo due to error:", publicId);
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
}

module.exports = new UserController();
