const express = require("express");
const ContactMessageController = require("../controllers/ContactMessageController");
const { validateAuth } = require("../middleware/validateAuth");

const router = express.Router();

// Routes công khai (không cần đăng nhập)
router.post(
  "/create",
  validateAuth({ required: false }),
  ContactMessageController.createMessage
);

// Routes yêu cầu đăng nhập
router.use(validateAuth());
router.get("/my-messages", ContactMessageController.getMyMessages);

// Routes yêu cầu quyền admin
router.use(validateAuth(["ADMIN"]));
router.get("/", ContactMessageController.getMessages);
router.get("/stats", ContactMessageController.getMessageStats);
router.get("/:id", ContactMessageController.getMessageById);
router.patch("/:id/status", ContactMessageController.updateStatus);
router.post("/:id/respond", ContactMessageController.respondToMessage);
router.delete("/:id", ContactMessageController.deleteMessage);
router.delete("/:id/hard-delete", ContactMessageController.hardDeleteMessage);
module.exports = router;
