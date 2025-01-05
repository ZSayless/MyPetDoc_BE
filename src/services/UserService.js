const ApiError = require("../exceptions/ApiError");
const User = require("../models/User");
const bcrypt = require("bcrypt");

class UserService {
  async createUser(userData) {
    if (await User.isEmailTaken(userData.email)) {
      throw new ApiError(400, "Email đã được sử dụng");
    }

    // Nếu có password, hash password
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }

    return User.create(userData);
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

  async apsoluteDelete(id) {
    const user = await this.getUserById(id);
    await User.hardDelete(id);
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

    return User.update(userId, updateData);
  }
}

module.exports = new UserService();
