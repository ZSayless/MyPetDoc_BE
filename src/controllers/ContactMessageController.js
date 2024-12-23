const ContactMessageService = require("../services/ContactMessageService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");
const ContactMessage = require("../models/ContactMessage");

class ContactMessageController {
  // Lấy danh sách tin nhắn với filter và phân trang
  getMessages = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, ...filters } = req.query;
    const result = await ContactMessageService.getMessages(
      filters,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  });

  // Lấy chi tiết một tin nhắn
  getMessageById = asyncHandler(async (req, res) => {
    const message = await ContactMessageService.getMessageById(req.params.id);
    res.json(message);
  });

  // Tạo tin nhắn mới
  createMessage = asyncHandler(async (req, res) => {
    // Lấy user ID nếu đã đăng nhập
    const userId = req.user ? req.user.id : null;
    const messageData = {
      ...req.body,
      user_id: userId,
    };

    const message = await ContactMessageService.createMessage(messageData);
    res.status(201).json(message);
  });

  // Cập nhật trạng thái tin nhắn
  updateStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status) {
      throw new ApiError(400, "Trạng thái không được để trống");
    }

    const message = await ContactMessageService.updateStatus(
      req.params.id,
      status,
      req.user.id
    );
    res.json(message);
  });

  // Phản hồi tin nhắn
  respondToMessage = asyncHandler(async (req, res) => {
    const message = await ContactMessageService.respondToMessage(
      req.params.id,
      req.body,
      req.user.id
    );
    res.json(message);
  });

  // Xóa tin nhắn (mềm)
  deleteMessage = asyncHandler(async (req, res) => {
    await ContactMessageService.deleteMessage(req.params.id);
    res.status(204).send();
  });

  // Xóa tin nhắn (cứng)
  hardDeleteMessage = asyncHandler(async (req, res) => {
    await ContactMessageService.hardDeleteMessage(req.params.id);
    res.status(204).send();
  });

  // Lấy tin nhắn của user hiện tại
  getMyMessages = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await ContactMessageService.getMessages(
      { user_id: req.user.id },
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  });

  // Lấy thống kê tin nhắn theo trạng thái
  getMessageStats = asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const filters = {};

    if (from) filters.from = new Date(from);
    if (to) filters.to = new Date(to);

    const stats = await ContactMessage.countMessages(filters);
    res.json(stats);
  });
}

module.exports = new ContactMessageController();
