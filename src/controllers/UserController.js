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
    const userData = {
      ...req.body,
      is_active: true,
    };

    // Xử lý avatar từ uploadedFiles
    if (req.uploadedFiles?.avatar) {
      userData.avatar = req.uploadedFiles.avatar.path;
    }

    // Xử lý pet_photo nếu role là GENERAL_USER hoặc có thông tin thú cưng
    if (
      (userData.role === "GENERAL_USER" || userData.pet_type) &&
      req.uploadedFiles?.pet_photo
    ) {
      userData.pet_photo = req.uploadedFiles.pet_photo.path;
    }

    const user = await UserService.createUser(userData);
    delete user.password;

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
      "is_locked",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== "") {
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

    if (
      updateData.role === "GENERAL_USER" &&
      updateData.pet_type &&
      updateData.pet_age &&
      updateData.pet_photo
    ) {
      updateData.role = "GENERAL_USER";
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
    res.status(200).json({
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

    // Remove password field from response
    delete user.password;

    res.json({
      status: "success",
      message: "Update profile successful",
      data: user,
    });
  });
}

module.exports = new UserController();
