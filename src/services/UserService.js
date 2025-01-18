const ApiError = require("../exceptions/ApiError");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const cloudinary = require("../config/cloudinary");
const Banner = require("../models/Banner");

class UserService {
  async createUser(userData) {
    if (await User.isEmailTaken(userData.email)) {
      // If there is a file uploaded, delete the file on Cloudinary
      if (userData.avatar && !userData.avatar.includes("default-avatar")) {
        try {
          const urlParts = userData.avatar.split("/");
          const publicId = `avatars/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Lỗi khi xóa ảnh trên Cloudinary:", deleteError);
        }
      }
      throw new ApiError(400, "Email đã được sử dụng");
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
      // If there is an error and the avatar is uploaded, delete the image on Cloudinary
      if (userData.avatar && !userData.avatar.includes("default-avatar")) {
        try {
          const urlParts = userData.avatar.split("/");
          const publicId = `avatars/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Lỗi khi xóa ảnh trên Cloudinary:", deleteError);
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
      throw new ApiError(404, "Không tìm thấy người dùng");
    }
    return user;
  }

  async updateUser(id, updateData) {
    const user = await this.getUserById(id);

    // Check if the new email is taken
    if (updateData.email && updateData.email !== user.email) {
      if (await User.isEmailTaken(updateData.email, id)) {
        throw new ApiError(400, "Email already used");
      }
    }

    // Delete old image on Cloudinary if there is a new image
    if (
      updateData.avatar &&
      user.avatar &&
      !user.avatar.includes("default-avatar")
    ) {
      try {
        const urlParts = user.avatar.split("/");
        const publicId = `avatars/${
          urlParts[urlParts.length - 1].split(".")[0]
        }`;
        await cloudinary.uploader.destroy(publicId);
        // console.log(`Deleted old image: ${publicId}`);
      } catch (deleteError) {
        console.error("Error deleting old image:", deleteError);
      }
    }

    // If there is an update password, hash new password
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    return User.update(id, updateData);
  }

  async toggleDelete(id) {
    const user = await this.getUserById(id);

    const updateData = {
      is_deleted: !user.is_deleted,
    };

    return User.update(id, updateData);
  }

  async apsoluteDelete(id, currentUser) {
    try {
      const userToDelete = await this.getUserById(id);

      // Check delete permission
      // Nếu không phải tự xóa tài khoản
      if (userToDelete.role == "ADMIN") {
        if (currentUser.id !== parseInt(id)) {
          // console.log("currentUser.id:", currentUser.id);
          // console.log("id:", id);
          throw new ApiError(403, "Không thể xóa tài khoản ADMIN khác");
        }
      }

      // Kiểm tra số lượng admin còn lại
      const adminCount = await User.countAdmins();
      if (adminCount <= 2) {
        throw new ApiError(
          400,
          "Không thể xóa tài khoản ADMIN khi chỉ còn 2 ADMIN trong hệ thống"
        );
      }

      // Kiểm tra các quan hệ trước khi xóa
      const relations = await User.checkUserRelations(id);
      // console.log("User relations:", relations);

      // 1. Update created_by to null for all banners of user
      const userBanners = await Banner.findByCreatedBy(id);
      for (const banner of userBanners) {
        await Banner.update(banner.id, { created_by: null });
      }

      // 2. Delete avatar on Cloudinary if there is
      if (
        userToDelete.avatar &&
        !userToDelete.avatar.includes("default-avatar")
      ) {
        try {
          const urlParts = userToDelete.avatar.split("/");
          const publicId = `avatars/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
          // console.log(`Deleted avatar: ${publicId}`);
        } catch (deleteError) {
          console.error("Error deleting image on Cloudinary:", deleteError);
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

  async toggleUserStatus(id, action) {
    const user = await this.getUserById(id);
    const updateData = {};

    if (action === "lock") {
      updateData.is_locked = !user.is_locked;
    } else if (action === "activate") {
      updateData.is_active = !user.is_active;
    }

    return User.update(id, updateData);
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

    // Validate dữ liệu cập nhật
    if (updateData.full_name && updateData.full_name.trim().length < 2) {
      throw new ApiError(400, "Full name must be at least 2 characters");
    }

    // Xóa ảnh cũ trên Cloudinary nếu có ảnh mới
    if (
      updateData.avatar &&
      user.avatar &&
      !user.avatar.includes("default-avatar")
    ) {
      try {
        const urlParts = user.avatar.split("/");
        const publicId = `avatars/${
          urlParts[urlParts.length - 1].split(".")[0]
        }`;
        await cloudinary.uploader.destroy(publicId);
        // console.log(`Deleted old image: ${publicId}`);
      } catch (deleteError) {
        console.error("Error deleting old image:", deleteError);
      }
    }

    return User.update(userId, updateData);
  }
}

module.exports = new UserService();
