const ContactMessageService = require("../services/ContactMessageService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const ContactMessage = require("../models/ContactMessage");

class ContactMessageController {
  // Get list of messages with filter and pagination
  getMessages = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, ...filters } = req.query;
    const result = await ContactMessageService.getMessages(
      filters,
      parseInt(page),
      parseInt(limit)
    );
    res.status(200).json({ success: true, result });
  });

  // Get details of a message
  getMessageById = asyncHandler(async (req, res) => {
    const message = await ContactMessageService.getMessageById(req.params.id);
    res.status(200).json({ success: true, message });
  });

  // Create new message
  createMessage = asyncHandler(async (req, res) => {
    // Get user ID if logged in
    const userId = req.user ? req.user.id : null;
    const messageData = {
      ...req.body,
      user_id: userId,
    };

    const message = await ContactMessageService.createMessage(messageData);
    res.status(201).json({ success: true, message });
  });

  // Update message status
  updateStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status) {
      throw new ApiError(400, "Status cannot be empty");
    }

    const message = await ContactMessageService.updateStatus(
      req.params.id,
      status,
      req.user.id
    );
    res.status(200).json({ success: true, message });
  });

  // Respond to message
  respondToMessage = asyncHandler(async (req, res) => {
    const message = await ContactMessageService.respondToMessage(
      req.params.id,
      req.body,
      req.user.id
    );
    res.status(200).json({ success: true, message });
  });

  // Soft delete message
  deleteMessage = asyncHandler(async (req, res) => {
    await ContactMessageService.deleteMessage(req.params.id);
    res.status(204).json({ success: true });
  });

  // Hard delete message
  hardDeleteMessage = asyncHandler(async (req, res) => {
    await ContactMessageService.hardDeleteMessage(req.params.id);
    res.status(204).json({ success: true });
  });

  // Get messages of current user
  getMyMessages = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await ContactMessageService.getMessages(
      { user_id: req.user.id },
      parseInt(page),
      parseInt(limit)
    );
    res.status(200).json({ success: true, result });
  });

  // Get message stats by status
  getMessageStats = asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const filters = {};

    if (from) filters.from = new Date(from);
    if (to) filters.to = new Date(to);

    const stats = await ContactMessage.countMessages(filters);
    res.status(200).json({ success: true, stats });
  });
}

module.exports = new ContactMessageController();
