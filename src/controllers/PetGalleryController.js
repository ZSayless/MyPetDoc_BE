const PetGalleryService = require("../services/PetGalleryService");
const ApiError = require("../exceptions/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const cloudinary = require("cloudinary");
const cache = require("../config/redis");
const { promisify } = require('util');

class PetGalleryController {
  // Method to clear post cache
  clearPostCache = async (postId = null, userId = null) => {
    try {
      // Get all keys matching the pattern
      const pattern = "cache:/api/community*";
      const keys = await cache.keys(pattern);

      // Delete each found key
      if (keys.length > 0) {
        await Promise.all(keys.map(key => cache.del(key)));
      }

      // Clear specific post's cache if provided
      if (postId) {
        await Promise.all([
          cache.del(`cache:/api/community/posts/${postId}`),
          cache.del(`cache:/api/community/posts/${postId}/comments`),
          cache.del(`cache:/api/community/posts/${postId}/like/check`),
          cache.del(`cache:/api/community/posts/${postId}/comments?*`)
        ]);
      }

      // Clear user's posts cache if provided
      if (userId) {
        await cache.del(`cache:/api/community/my-posts`);
      }

    } catch (error) {
      console.error("Error clearing pet gallery cache:", error);
    }
  };

  // Method to clear comment cache
  clearCommentCache = async (postId, commentId = null) => {
    try {
      // Get all comment related keys
      const pattern = `cache:/api/community/posts/${postId}/comments*`;
      const keys = await cache.keys(pattern);

      // Delete each found key
      if (keys.length > 0) {
        await Promise.all(keys.map(key => cache.del(key)));
      }

      // Clear specific comment's replies if provided
      if (commentId) {
        await Promise.all([
          cache.del(`cache:/api/community/comments/${commentId}/replies`),
          cache.del(`cache:/api/community/comments/${commentId}/replies?*`)
        ]);
      }

    } catch (error) {
      console.error("Error clearing comment cache:", error);
    }
  };

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

    // Clear cache after creating new post
    await this.clearPostCache(null, userId);

    res.status(201).json({
      success: true,
      message: "Create post successful",
      data: post,
    });
  });

  // Get list of posts
  getPosts = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      pet_type,
      tags,
      user_id,
      sort_by,
      sort_order,
      status = 'ACTIVE'
    } = req.query;

    const posts = await PetGalleryService.getPosts({
      page: parseInt(page),
      limit: parseInt(limit),
      petType: pet_type,
      tags,
      userId: user_id,
      sortBy: sort_by,
      sortOrder: sort_order,
      status
    });

    res.json({
      success: true,
      message: "Get list of posts successful",
      data: posts,
    });
  });

  // Get post details
  getPostDetail = asyncHandler(async (req, res, next) => {
    const slug = req.params.slug;

    const post = await PetGalleryService.getPostDetailBySlug(slug);

    if (!post) {
      return next(new ApiError(404, "Post not found"));
    }

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

    // Helper function to delete images
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

      const file = req.file;
      const post = await PetGalleryService.updatePost(
        postId,
        req.body,
        userId,
        file
      );

      // Clear cache after updating post
      await this.clearPostCache(postId, post.user_id);

      res.json({
        success: true,
        message: "Update post successful",
        data: post,
      });
    } catch (error) {
      // Ensure to delete image in case of any error
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

      // Clear cache after deleting post
      await this.clearPostCache(postId, userId);

      res.json({
        success: true,
        message: "Delete post successful",
      });
    } catch (error) {
      throw new ApiError(500, "Internal server error");
    }
  });

  // Check if user has liked post
  checkUserLikedPost = asyncHandler(async (req, res, next) => {
    const postId = req.params.id;
    const userId = req.user.id;

    // Check parameters
    if (!postId || !userId) {
      throw new ApiError(400, "Missing required parameters");
    }

    const result = await PetGalleryService.checkUserLikedPost(postId, userId);

    res.json({
      success: true,
      message: "Check user liked post successful",
      data: result,
    });
  });

  // Like/Unlike post
  toggleLike = asyncHandler(async (req, res, next) => {
    const postId = req.params.id;
    const userId = req.user.id;

    // Check parameters
    if (!postId || !userId) {
      throw new ApiError(400, "Missing required parameters");
    }

    const result = await PetGalleryService.toggleLike(postId, userId);

    // Clear cache after like/unlike post
    await this.clearPostCache(postId, userId);

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

      // Clear cache after adding new comment
      await this.clearCommentCache(postId, parent_id);

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
  getCommentReplies = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId;
    const { page = 1, limit = 10 } = req.query;

    const result = await PetGalleryService.getCommentReplies(commentId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      message: "Get replies successful",
      data: result
    });
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

      const comment = await PetGalleryService.deleteComment(
        commentId,
        userId,
        isAdmin
      );

      // Clear cache after deleting comment
      await this.clearCommentCache(comment.post_id, commentId);

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

  // Update post status
  updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!status) {
      throw new ApiError(400, 'Status is required');
    }

    const updatedPost = await PetGalleryService.updateStatus(
      parseInt(id),
      status.toUpperCase(),
      userId,
      isAdmin
    );

    // Clear cache
    await this.clearPostCache(id, updatedPost.user_id);

    res.json({
      success: true,
      message: 'Update post status successful',
      data: updatedPost
    });
  });

  // Get all posts without status filter
  getAllPosts = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      pet_type,
      tags,
      user_id,
      sort_by,
      sort_order
    } = req.query;

    const posts = await PetGalleryService.getAllPosts({
      page: parseInt(page),
      limit: parseInt(limit),
      petType: pet_type,
      tags,
      userId: user_id,
      sortBy: sort_by,
      sortOrder: sort_order
    });

    res.json({
      success: true,
      message: "Get all posts successful",
      data: posts
    });
  });

  // Get posts by logged in user
  getMyPosts = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      pet_type,
      tags,
      sort_by,
      sort_order,
      status
    } = req.query;

    const posts = await PetGalleryService.getPosts({
      page: parseInt(page),
      limit: parseInt(limit),
      petType: pet_type,
      tags,
      userId: userId,
      sortBy: sort_by,
      sortOrder: sort_order,
      status
    });

    res.json({
      success: true,
      message: "Get posts by logged in user successful",
      data: posts
    });
  });
}

module.exports = new PetGalleryController();
