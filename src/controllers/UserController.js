const UserService = require("../services/UserService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");

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
    const user = await UserService.createUser(req.body);
    res.status(201).json(user);
  });

  updateUser = asyncHandler(async (req, res) => {
    const user = await UserService.updateUser(req.params.id, req.body);
    res.json(user);
  });

  apsoluteDelete = asyncHandler(async (req, res) => {
    await UserService.apsoluteDelete(req.params.id);
    res.status(204).send();
  });

  toggleDelete = asyncHandler(async (req, res) => {
    const user = await UserService.toggleDelete(req.params.id);
    res.json(user);
  });

  toggleLock = asyncHandler(async (req, res) => {
    const user = await UserService.toggleUserStatus(req.params.id, "lock");
    res.json(user);
  });

  toggleActive = asyncHandler(async (req, res) => {
    const user = await UserService.toggleUserStatus(req.params.id, "activate");
    res.json(user);
  });
}

module.exports = new UserController();
