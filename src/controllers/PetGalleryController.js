const PetGalleryService = require("../services/PetGalleryService");
const ApiError = require("../exceptions/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const cloudinary = require("cloudinary");

class PetGalleryController {
  // Create new post
  createPost = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const file = req.file;

    // Log for debugging
    // console.log("Request body:", req.body);
    // console.log("File:", file);
    // console.log("Content-Type:", req.headers["content-type"]);

    // Check file
    if (!file) {
      throw new ApiError(400, "Please upload an image for the post");
    }

    const post = await PetGalleryService.createPost(req.body, userId, file);

    res.status(201).json({
      success: true,
      message: "Create post successful",
      data: post,
    });
  });

  // Get list of posts
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
      message: "Get list of posts successful",
      data: posts,
    });
  });

  // Get post details
  getPostDetail = asyncHandler(async (req, res, next) => {
    const postId = req.params.id;
    const post = await PetGalleryService.getPostDetail(postId);

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
    const files = req.files;

    // Hàm helper để xóa ảnh
    const deleteUploadedFiles = async (files) => {
      try {
        if (!files) return;

        const filesToDelete = Array.isArray(files) ? files : [files];
        for (const file of filesToDelete) {
          if (file.path) {
            try {
              const urlParts = file.path.split("/");
              const publicId = `petgallerys/${
                urlParts[urlParts.length - 1].split(".")[0]
              }`;
              await cloudinary.uploader.destroy(publicId);
            } catch (error) {
              console.error("Error deleting image:", error);
            }
          }
        }
      } catch (error) {
        throw new ApiError(500, "Internal server error");
      }
    };

    try {
      // Check file count
      if (files && Object.keys(files).length > 1) {
        await deleteUploadedFiles(Object.values(files));
        throw new ApiError(400, "Only allowed to upload 1 image");
      }

      // Check if post exists
      const existingPost = await PetGalleryService.getPostDetail(postId);
      if (!existingPost) {
        await deleteUploadedFiles(files || req.file);
        throw new ApiError(404, "Post not found");
      }

      // Check permission to edit
      if (existingPost.user_id !== userId) {
        await deleteUploadedFiles(files || req.file);
        throw new ApiError(403, "You are not allowed to edit this post");
      }

      const file = req.file;
      const post = await PetGalleryService.updatePost(
        postId,
        req.body,
        userId,
        file
      );

      res.json({
        success: true,
        message: "Update post successful",
        data: post,
      });
    } catch (error) {
      // Đảm bảo xóa ảnh trong mọi trường hợp lỗi
      await deleteUploadedFiles(files || req.file);
      throw error;
    }
  });

  // Delete post
  deletePost = asyncHandler(async (req, res, next) => {
    try {
      const postId = req.params.id;
      const userId = req.user.id;
      const userRole = req.user.role;
      const isAdmin = userRole === "ADMIN";

      await PetGalleryService.deletePost(postId, userId, isAdmin);

      res.json({
        success: true,
        message: "Delete post successful",
      });
    } catch (error) {
      throw new ApiError(500, "Internal server error");
    }
  });

  // Like/Unlike post
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

  // Add comment
  addComment = asyncHandler(async (req, res, next) => {
    try {
      const postId = req.params.id;
      const userId = req.user.id;
      const { content, parent_id } = req.body;

      const comment = await PetGalleryService.addComment(postId, userId, {
        content,
        parent_id,
      });

      res.status(201).json({
        success: true,
        message: "Add comment successful",
        data: comment,
      });
    } catch (error) {
      throw new ApiError(500, "Internal server error");
    }
  });

  // Get comments of post
  getComments = asyncHandler(async (req, res, next) => {
    try {
      const postId = req.params.id;
      const { page = 1, limit = 10 } = req.query;

      const result = await PetGalleryService.getPostComments(postId, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        message: "Get comments successful",
        data: result,
      });
    } catch (error) {
      throw new ApiError(500, "Internal server error");
    }
  });

  // Get replies of comment
  getCommentReplies = asyncHandler(async (req, res, next) => {
    try {
      const commentId = req.params.commentId;
      const { page = 1, limit = 10 } = req.query;

      const replies = await PetGalleryService.getCommentReplies(commentId, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        message: "Get replies successful",
        data: replies,
      });
    } catch (error) {
      throw new ApiError(500, "Internal server error");
    }
  });

  // Delete comment
  deleteComment = asyncHandler(async (req, res, next) => {
    try {
      const commentId = req.params.commentId;
      const userId = req.user.id;
      const userRole = req.user.role;
      const isAdmin = userRole === "ADMIN";

      // If it is admin route
      if (req.baseUrl.includes("/admin")) {
        if (!isAdmin) {
          throw new ApiError(403, "You are not allowed to access");
        }
      }

      await PetGalleryService.deleteComment(commentId, userId, isAdmin);

      res.json({
        success: true,
        message: "Delete comment successful",
      });
    } catch (error) {
      throw new ApiError(500, "Internal server error");
    }
  });

  // Report comment
  reportComment = asyncHandler(async (req, res) => {
    try {
      const commentId = req.params.commentId;
      const userId = req.user.id;
      const reportData = req.body;

      const result = await PetGalleryService.reportComment(
        commentId,
        reportData,
        userId
      );

      res.json(result);
    } catch (error) {
      throw new ApiError(500, "Internal server error");
    }
  });
}

module.exports = new PetGalleryController();
