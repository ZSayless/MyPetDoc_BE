const PetPostService = require("../services/PetPostService");
const ApiError = require("../exceptions/ApiError");
const asyncHandler = require("../utils/asyncHandler");

class PetPostController {
  // Create new post
  createPost = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const files = req.files || [];

    // Validate data
    if (!req.body.title || !req.body.content) {
      throw new ApiError(400, "Title and content are required");
    }

    // Create post data
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
      message: "Create post successful",
      data: post,
    });
  });

  // Get list of posts
  getPosts = asyncHandler(async (req, res) => {
    const result = await PetPostService.getPosts(req.query);

    res.json({
      success: true,
      message: "Get list of posts successful",
      data: result,
    });
  });

  // Get post details
  getPostDetail = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const post = await PetPostService.getPostDetail(postId);

    res.json({
      success: true,
      message: "Get post details successful",
      data: post,
    });
  });

  // Update post
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
      message: "Update post successful",
      data: post,
    });
  });

  // Like/Unlike post
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

  // Get list of users who liked
  getLikedUsers = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const { page = 1, limit = 10 } = req.query;

    const result = await PetPostService.getLikedUsers(postId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      message: "Get list of users who liked successful",
      data: result,
    });
  });

  // Add comment
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
      message: "Add comment successful",
      data: comment,
    });
  });

  // Get comments of post
  getComments = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const { page = 1, limit = 10 } = req.query;

    const result = await PetPostService.getPostComments(postId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      message: "Get comments successful",
      data: result,
    });
  });

  // Get replies of comment
  getCommentReplies = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId;
    const { page = 1, limit = 10 } = req.query;

    const replies = await PetPostService.getCommentReplies(commentId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      message: "Get replies successful",
      data: replies,
    });
  });

  // Delete comment
  deleteComment = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    await PetPostService.deleteComment(commentId, userId, isAdmin);

    res.json({
      success: true,
      message: "Delete comment successful",
    });
  });

  // Update post status
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
      message: "Update post status successful",
      data: post,
    });
  });

  // Report comment
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

  // Soft delete post
  softDeletePost = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    await PetPostService.softDeletePost(postId, userId, isAdmin);

    res.json({
      success: true,
      message: "Soft delete post successful",
    });
  });

  // Hard delete post
  hardDeletePost = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    await PetPostService.hardDeletePost(postId, userId, isAdmin);

    res.json({
      success: true,
      message: "Hard delete post successful",
    });
  });

  // Soft delete many posts
  softDeleteManyPosts = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, "Invalid list of post IDs");
    }

    await PetPostService.softDeleteManyPosts(ids, userId, isAdmin);

    res.json({
      success: true,
      message: "Soft delete many posts successful",
    });
  });

  // Hard delete many posts
  hardDeleteManyPosts = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, "Invalid list of post IDs");
    }

    await PetPostService.hardDeleteManyPosts(ids, userId, isAdmin);

    res.json({
      success: true,
      message: "Hard delete many posts successful",
    });
  });

  // Toggle soft delete
  toggleSoftDelete = asyncHandler(async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    const result = await PetPostService.toggleSoftDelete(
      postId,
      userId,
      isAdmin
    );

    res.json({
      success: true,
      ...result,
    });
  });
}

module.exports = new PetPostController();
