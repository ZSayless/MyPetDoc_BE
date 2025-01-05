const UserService = require("../services/UserService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const bcrypt = require("bcrypt");
const { deleteUploadedFile } = require("../middleware/uploadMiddleware");

class UserController {
  getUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, ...filters } = req.query;
    const result = await UserService.getUsers(
      filters,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  });

  getUserById = asyncHandler(async (req, res) => {
    const user = await UserService.getUserById(req.params.id);
    res.json(user);
  });

  createUser = asyncHandler(async (req, res) => {
    const salt = await bcrypt.genSalt(10);
    const userData = {
      ...req.body,
      password: await bcrypt.hash(req.body.password, salt),
    };
    const user = await UserService.createUser(userData);
    delete user.password;
    res.status(201).json(user);
});

  updateUser = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    // Chỉ lấy các trường có giá trị
    let updateData = {};
    const allowedFields = ['full_name', 'email', 'password', 'role', 'is_active', 'is_locked'];
    
    // Lọc và chỉ lấy các trường có giá trị
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== '') {
        updateData[field] = req.body[field];
      }
    });

    let oldAvatar = null;

    // Lấy thông tin user cũ để lưu avatar cũ (nếu có)
    const currentUser = await UserService.getUserById(userId);
    if (currentUser.avatar && !currentUser.avatar.includes('default-avatar')) {
      oldAvatar = currentUser.avatar.split('/').pop(); // Lấy tên file từ đường dẫn
    }

    // Xử lý avatar mới nếu có upload file
    if (req.file || (req.files && req.files.avatar)) {
      const uploadedFile = req.file || req.files.avatar[0];
      updateData.avatar = uploadedFile.filename;
    }

    // Kiểm tra xem có dữ liệu để cập nhật không
    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, "Không có dữ liệu để cập nhật");
    }

    try {
      // Cập nhật user
      const user = await UserService.updateUser(userId, updateData);

      // Nếu cập nhật thành công và có avatar cũ, xóa avatar cũ
      if (user && oldAvatar && updateData.avatar) {
        await deleteUploadedFile(oldAvatar);
      }

      res.json({
        status: "success",
        message: "Cập nhật người dùng thành công",
        data: user
      });
    } catch (error) {
      // Nếu có lỗi và đã upload avatar mới, xóa avatar mới
      if (updateData.avatar) {
        const newAvatarFileName = updateData.avatar.split('/').pop();
        await deleteUploadedFile(newAvatarFileName);
      }
      throw error;
    }
  });

  apsoluteDelete = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    
    // Lấy thông tin user trước khi xóa
    const user = await UserService.getUserById(userId);
    
    // Xóa user
    await UserService.apsoluteDelete(userId);

    // Nếu user có avatar và không phải avatar mặc định, xóa file
    if (user.avatar && !user.avatar.includes('default-avatar')) {
      const avatarFileName = user.avatar.split('/').pop();
      await deleteUploadedFile(avatarFileName);
    }

    res.status(204).send();
  });

  toggleDelete = asyncHandler(async (req, res) => {
    const user = await UserService.toggleDelete(req.params.id);
    res.json({
      status: "success",
      message: user.is_deleted 
        ? "Đã xóa mềm người dùng" 
        : "Đã khôi phục người dùng",
      data: user
    });
  });

  toggleLock = asyncHandler(async (req, res) => {
    const user = await UserService.toggleUserStatus(req.params.id, "lock");
    res.json(user);
  });

  toggleActive = asyncHandler(async (req, res) => {
    const user = await UserService.toggleUserStatus(req.params.id, "activate");
    res.json(user);
  });

  updateProfile = asyncHandler(async (req, res) => {
    const allowedFields = ["full_name", "avatar"];
    const updateData = {};
    let oldAvatar = null;

    // Lấy thông tin user cũ để lưu avatar cũ (nếu có)
    const currentUser = await UserService.getUserById(req.user.id);
    if (currentUser.avatar && !currentUser.avatar.includes('default-avatar')) {
      oldAvatar = currentUser.avatar.split('/').pop();
    }

    // Chỉ cho phép cập nhật các trường được chỉ định
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Xử lý avatar mới nếu có upload file
    if (req.file || (req.files && req.files.avatar)) {
      const uploadedFile = req.file || req.files.avatar[0];
      updateData.avatar = uploadedFile.filename;
    }

    // Cập nhật profile
    const user = await UserService.updateProfile(req.user.id, updateData);

    // Nếu cập nhật thành công và có avatar cũ, xóa avatar cũ
    if (user && oldAvatar && updateData.avatar) {
      await deleteUploadedFile(oldAvatar);
    }

    res.json({
      status: "success",
      message: "Cập nhật thông tin cá nhân thành công",
      data: user
    });
  });
}

module.exports = new UserController();
