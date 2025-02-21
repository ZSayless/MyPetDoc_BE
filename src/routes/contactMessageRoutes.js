const express = require("express");
const ContactMessageController = require("../controllers/ContactMessageController");
const { validateAuth } = require("../middleware/validateAuth");
const cacheMiddleware = require("../middleware/cacheMiddleware");

const router = express.Router();

// Public routes (no need to login)
router.post(
  "/create",
  validateAuth({ required: false }),
  ContactMessageController.createMessage
);

// Routes require login
router.use(validateAuth());
router.get(
  "/my-messages", 
  cacheMiddleware(1800),
  ContactMessageController.getMyMessages
);

// Routes require admin permission
router.use(validateAuth(["ADMIN"]));
router.get(
  "/",
  cacheMiddleware(1800),
  ContactMessageController.getMessages
);
router.get(
  "/stats",
  cacheMiddleware(1800),
  ContactMessageController.getMessageStats
);
router.get(
  "/:id",
  cacheMiddleware(1800),
  ContactMessageController.getMessageById
);
router.patch("/:id/status", ContactMessageController.updateStatus);
router.post("/:id/respond", ContactMessageController.respondToMessage);
router.delete("/:id", ContactMessageController.deleteMessage);
router.delete("/:id/hard-delete", ContactMessageController.hardDeleteMessage);
module.exports = router;
