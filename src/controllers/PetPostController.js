const PetPostService = require("../services/PetPostService");
const ApiError = require("../exceptions/ApiError");
const asyncHandler = require("../utils/asyncHandler");

class PetPostController {
  // Tạo bài viết mới
  createPost = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const files = req.files || [];

    // Validate dữ liệu
    if (!req.body.title || !req.body.content) {
      throw new ApiError(400, "Tiêu đề và nội dung bài viết là bắt buộc");
    }

    // Tạo dữ liệu cho bài viết
    const postData = {
      title: req.body.title,
      content: req.body.content,
      summary: req.body.summary,
      post_type: req.body.post_type || "BLOG",
      category: req.body.category,
      tags: req.body.tags,
      status: req.body.status || "DRAFT",
      author_id: userId,
      hospital_id: req.body.hospital_id,
      meta_title: req.body.meta_title,
      meta_description: req.body.meta_description,
      slug: req.body.slug,
      event_start_date: req.body.event_start_date,
      event_end_date: req.body.event_end_date,
      event_location: req.body.event_location,
      event_registration_link: req.body.event_registration_link,
      source: req.body.source,
      external_link: req.body.external_link,
      thumbnail_image: req.body.thumbnail_image,
      featured_image: req.body.featured_image,
    };

    const post = await PetPostService.createPost(postData, userId);

    res.status(201).json({
      success: true,
      message: "Tạo bài viết thành công",
      data: post,
    });
  });

  // Lấy danh sách bài viết
  getPosts = asyncHandler(async (req, res) => {
    const result = await PetPostService.getPosts(req.query);

    res.json({
      success: true,
      message: "Lấy danh sách bài viết thành công",
      data: result,
    });
  });

  // Lấy chi tiết bài viết
  getPostDetail = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const post = await PetPostService.getPostDetail(postId);

    res.json({
      success: true,
      message: "Lấy chi tiết bài viết thành công",
      data: post,
    });
  });

  // Cập nhật bài viết
  updatePost = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const files = req.files || [];

    const post = await PetPostService.updatePost(
      postId,
      req.body,
      userId,
      files
    );

    res.json({
      success: true,
      message: "Cập nhật bài viết thành công",
      data: post,
    });
  });

  // Xóa bài viết
  deletePost = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    if (req.baseUrl.includes("/admin") && !isAdmin) {
      throw new ApiError(403, "Không có quyền truy cập");
    }

    await PetPostService.deletePost(postId, userId, isAdmin);

    res.json({
      success: true,
      message: "Xóa bài viết thành công",
    });
  });

  // Like/Unlike bài viết
  toggleLike = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    const result = await PetPostService.toggleLike(postId, userId);

    res.json({
      success: true,
      message: result.message,
      data: {
        hasLiked: result.hasLiked,
      },
    });
  });

  // Lấy danh sách người dùng đã like
  getLikedUsers = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const { page = 1, limit = 10 } = req.query;

    const result = await PetPostService.getLikedUsers(postId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      message: "Lấy danh sách người dùng đã thích thành công",
      data: result,
    });
  });

  // Thêm comment
  addComment = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const { content, parent_id } = req.body;

    const comment = await PetPostService.addComment(postId, userId, {
      content,
      parent_id,
    });

    res.status(201).json({
      success: true,
      message: "Thêm bình luận thành công",
      data: comment,
    });
  });

  // Lấy comments của bài viết
  getComments = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const { page = 1, limit = 10 } = req.query;

    const result = await PetPostService.getPostComments(postId, {
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
  getCommentReplies = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId;
    const { page = 1, limit = 10 } = req.query;

    const replies = await PetPostService.getCommentReplies(commentId, {
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
  deleteComment = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    await PetPostService.deleteComment(commentId, userId, isAdmin);

    res.json({
      success: true,
      message: "Xóa bình luận thành công",
    });
  });

  // Cập nhật trạng thái bài viết
  updateStatus = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const { status } = req.body;
    const isAdmin = req.user.role === "ADMIN";

    const post = await PetPostService.updateStatus(
      postId,
      status,
      userId,
      isAdmin
    );

    res.json({
      success: true,
      message: "Cập nhật trạng thái bài viết thành công",
      data: post,
    });
  });

  // Báo cáo comment
  reportComment = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId;
    const userId = req.user.id;
    const reportData = req.body;

    const result = await PetPostService.reportComment(
      commentId,
      reportData,
      userId
    );

    res.json(result);
  });
}

module.exports = new PetPostController();
