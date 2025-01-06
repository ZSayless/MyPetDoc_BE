const PetGalleryService = require("../services/PetGalleryService");
const ApiError = require("../exceptions/ApiError");
const asyncHandler = require("../utils/asyncHandler");

class PetGalleryController {
  // Tạo bài đăng mới
  createPost = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const file = req.file;

    // Log để debug
    console.log("Request body:", req.body);
    console.log("File:", file);
    console.log("Content-Type:", req.headers["content-type"]);

    // Kiểm tra file
    if (!file) {
      throw new ApiError(400, "Vui lòng tải lên ảnh cho bài đăng");
    }

    const post = await PetGalleryService.createPost(req.body, userId, file);

    res.status(201).json({
      success: true,
      message: "Tạo bài đăng thành công",
      data: post,
    });
  });

  // Lấy danh sách bài đăng
  getPosts = asyncHandler(async (req, res, next) => {
    const {
      page = 1,
      limit = 10,
      pet_type,
      tags,
      user_id,
      sort_by,
      sort_order,
    } = req.query;

    const posts = await PetGalleryService.getPosts({
      page: parseInt(page),
      limit: parseInt(limit),
      petType: pet_type,
      tags,
      userId: user_id,
      sortBy: sort_by,
      sortOrder: sort_order,
    });

    res.json({
      success: true,
      message: "Lấy danh sách bài đăng thành công",
      data: posts,
    });
  });

  // Lấy chi tiết bài đăng
  getPostDetail = asyncHandler(async (req, res, next) => {
    const postId = req.params.id;
    const post = await PetGalleryService.getPostDetail(postId);

    res.json({
      success: true,
      message: "Lấy chi tiết bài đăng thành công",
      data: post,
    });
  });

  // Cập nhật bài đăng
  updatePost = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const file = req.file;

    const post = await PetGalleryService.updatePost(
      postId,
      req.body,
      userId,
      file
    );

    res.json({
      success: true,
      message: "Cập nhật bài đăng thành công",
      data: post,
    });
  });

  // Xóa bài đăng
  deletePost = asyncHandler(async (req, res, next) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const isAdmin = userRole === "ADMIN";

    // Nếu là route admin
    if (req.baseUrl.includes("/admin")) {
      if (!isAdmin) {
        throw new ApiError(403, "Không có quyền truy cập");
      }
    }

    await PetGalleryService.deletePost(postId, userId, isAdmin);

    res.json({
      success: true,
      message: "Xóa bài đăng thành công",
    });
  });

  // Like/Unlike bài đăng
  toggleLike = asyncHandler(async (req, res, next) => {
    const postId = req.params.id;
    const userId = req.user.id;

    const result = await PetGalleryService.toggleLike(postId, userId);

    res.json({
      success: true,
      message: result.message,
      data: {
        hasLiked: result.hasLiked,
      },
    });
  });

  // Thêm comment
  addComment = asyncHandler(async (req, res, next) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const { content, parent_id } = req.body;

    const comment = await PetGalleryService.addComment(postId, userId, {
      content,
      parent_id,
    });

    res.status(201).json({
      success: true,
      message: "Thêm bình luận thành công",
      data: comment,
    });
  });

  // Lấy comments của bài đăng
  getComments = asyncHandler(async (req, res, next) => {
    const postId = req.params.id;
    const { page = 1, limit = 10 } = req.query;

    const result = await PetGalleryService.getPostComments(postId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      message: "Lấy danh sách bình luận thành công",
      data: result,
    });
  });

  // Lấy replies của comment
  getCommentReplies = asyncHandler(async (req, res, next) => {
    const commentId = req.params.commentId;
    const { page = 1, limit = 10 } = req.query;

    const replies = await PetGalleryService.getCommentReplies(commentId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      message: "Lấy danh sách trả lời thành công",
      data: replies,
    });
  });

  // Xóa comment
  deleteComment = asyncHandler(async (req, res, next) => {
    const commentId = req.params.commentId;
    const userId = req.user.id;
    const userRole = req.user.role;
    const isAdmin = userRole === "ADMIN";

    // Nếu là route admin
    if (req.baseUrl.includes("/admin")) {
      if (!isAdmin) {
        throw new ApiError(403, "Không có quyền truy cập");
      }
    }

    await PetGalleryService.deleteComment(commentId, userId, isAdmin);

    res.json({
      success: true,
      message: "Xóa bình luận thành công",
    });
  });

  // Báo cáo comment
  reportComment = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId;
    const userId = req.user.id;
    const reportData = req.body;

    const result = await PetGalleryService.reportComment(
      commentId,
      reportData,
      userId
    );

    res.json(result);
  });
}

module.exports = new PetGalleryController();
