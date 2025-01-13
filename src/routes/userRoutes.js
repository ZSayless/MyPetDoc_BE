const express = require("express");
const UserController = require("../controllers/UserController");
const { validateAuth } = require("../middleware/validateAuth");
const { handleUploadAvatar } = require("../middleware/uploadMiddleware");

const router = express.Router();

// Route update personal profile
router.put(
  "/profile/update",
  validateAuth(),
  handleUploadAvatar,
  UserController.updateProfile
);

// Routes require admin permission
router.use(validateAuth(["ADMIN"]));

router.get("/", UserController.getUsers);
router.get("/:id", UserController.getUserById);
router.post("/create", handleUploadAvatar, UserController.createUser);
router.put("/:id", handleUploadAvatar, UserController.updateUser);
router.delete("/:id", UserController.apsoluteDelete);
router.patch("/:id/toggle-delete", UserController.toggleDelete);
router.patch("/:id/toggle-lock", UserController.toggleLock);
router.patch("/:id/toggle-active", UserController.toggleActive);

module.exports = router;
