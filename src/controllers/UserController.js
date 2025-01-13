const UserService = require("../services/UserService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const bcrypt = require("bcrypt");

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
      is_active: true,
    };
    // Add image path from Cloudinary if file is uploaded
    if (req.file) {
      userData.avatar = req.file.path;
    }
    const user = await UserService.createUser(userData);
    delete user.password;
    res.status(201).json(user);
  });

  updateUser = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    let updateData = {};
    const allowedFields = [
      "full_name",
      "email",
      "password",
      "role",
      "is_active",
      "is_locked",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== "") {
        updateData[field] = req.body[field];
      }
    });

    // Handle new avatar if file is uploaded
    if (req.file) {
      updateData.avatar = req.file.path;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, "No data to update");
    }

    const user = await UserService.updateUser(userId, updateData);

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

    res.json({
      status: "success",
      message: "Delete user successful",
    });
  });

  toggleDelete = asyncHandler(async (req, res) => {
    const user = await UserService.toggleDelete(req.params.id);
    res.json({
      status: "success",
      message: user.is_deleted
        ? "Soft delete user successful"
        : "Restore user successful",
      data: user,
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
    const allowedFields = ["full_name"];
    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Handle new avatar if file is uploaded
    if (req.file) {
      updateData.avatar = req.file.path;
    }

    const user = await UserService.updateProfile(req.user.id, updateData);

    res.json({
      status: "success",
      message: "Update profile successful",
      data: user,
    });
  });
}

module.exports = new UserController();
