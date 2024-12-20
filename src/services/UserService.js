const ApiError = require("../exceptions/ApiError");
const User = require("../models/User");

class UserService {
  async createUser(userData) {
    if (await User.isEmailTaken(userData.email)) {
      throw new ApiError(400, "Email đã được sử dụng");
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

    if (updateData.email && updateData.email !== user.email) {
      if (await User.isEmailTaken(updateData.email, id)) {
        throw new ApiError(400, "Email đã được sử dụng");
      }
    }

    return User.update(id, updateData);
  }

  async toggleDelete(id) {
    const user = await this.getUserById(id);
    
    const updateData = {
      is_deleted: !user.is_deleted
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
}

module.exports = new UserService();
