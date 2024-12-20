const express = require("express");
const UserController = require("../controllers/UserController");
const { validateAuth } = require("../middleware/validateAuth");

const router = express.Router();

// Middleware xác thực cho tất cả các routes
router.use(validateAuth(["HOSPITAL_ADMIN"]));

router.get("/", UserController.getUsers);
router.get("/:id", UserController.getUserById);
router.post("/create", UserController.createUser);
router.put("/:id", UserController.updateUser);
router.delete("/:id", UserController.apsoluteDelete);
router.patch("/:id/toggle-delete", UserController.toggleDelete);
router.patch("/:id/toggle-lock", UserController.toggleLock);
router.patch("/:id/toggle-active", UserController.toggleActive);

module.exports = router;
