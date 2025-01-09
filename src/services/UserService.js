const ApiError = require("../exceptions/ApiError");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const cloudinary = require("../config/cloudinary");
const Banner = require("../models/Banner");

class UserService {
  async createUser(userData) {
    if (await User.isEmailTaken(userData.email)) {
      // Nếu có file đã upload, xóa file trên Cloudinary
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

    // Nếu có password, hash password
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }

    // Xử lý avatar
    const defaultAvatar = "default-avatar.png";
    if (!userData.avatar) {
      userData.avatar = defaultAvatar;
    }

    // Đảm bảo is_active = true
    userData.is_active = true;

    try {
      return await User.create(userData);
    } catch (error) {
      // Nếu có lỗi và đã upload avatar, xóa ảnh trên Cloudinary
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

    // Kiểm tra email mới có bị trùng không
    if (updateData.email && updateData.email !== user.email) {
      if (await User.isEmailTaken(updateData.email, id)) {
        throw new ApiError(400, "Email đã được sử dụng");
      }
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
        console.log(`Đã xóa ảnh cũ: ${publicId}`);
      } catch (deleteError) {
        console.error("Lỗi khi xóa ảnh cũ:", deleteError);
      }
    }

    // Nếu có cập nhật password, hash password mới
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

      // Kiểm tra quyền xóa
      if (userToDelete.role === "ADMIN") {
        if (currentUser.id !== id) {
          // Nếu không phải tự xóa chính mình
          throw new ApiError(403, "Không thể xóa tài khoản ADMIN khác");
        }
      }

      // 1. Cập nhật created_by thành null cho tất cả banner của user
      const userBanners = await Banner.findByCreatedBy(id);
      for (const banner of userBanners) {
        await Banner.update(banner.id, { created_by: null });
      }

      // 2. Xóa ảnh avatar trên Cloudinary nếu có
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
          console.log(`Đã xóa ảnh avatar: ${publicId}`);
        } catch (deleteError) {
          console.error("Lỗi khi xóa ảnh trên Cloudinary:", deleteError);
        }
      }

      // 3. Xóa user
      await User.hardDelete(id);
    } catch (error) {
      console.error("Delete user error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Lỗi khi xóa người dùng: " + error.message);
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
      errors.push("Mật khẩu là bắt buộc");
    } else if (data.password.length < 6) {
      errors.push("Mật khẩu phải có ít nhất 6 ký tự");
    } else if (!/[A-Z]/.test(data.password)) {
      errors.push("Mật khẩu phải chứa ít nhất 1 chữ hoa");
    } else if (!/[0-9]/.test(data.password)) {
      errors.push("Mật khẩu phải chứa ít nhất 1 số");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Dữ liệu không hợp lệ", errors);
    }
  }

  async updateProfile(userId, updateData) {
    const user = await this.getUserById(userId);

    // Validate dữ liệu cập nhật
    if (updateData.full_name && updateData.full_name.trim().length < 2) {
      throw new ApiError(400, "Họ tên phải có ít nhất 2 ký tự");
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
        console.log(`Đã xóa ảnh cũ: ${publicId}`);
      } catch (deleteError) {
        console.error("Lỗi khi xóa ảnh cũ:", deleteError);
      }
    }

    return User.update(userId, updateData);
  }
}

module.exports = new UserService();
