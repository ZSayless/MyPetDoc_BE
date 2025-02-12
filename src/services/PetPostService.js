const ApiError = require("../exceptions/ApiError");
const PetPost = require("../models/PetPost");
const PetPostComment = require("../models/PetPostComment");
const PetPostLike = require("../models/PetPostLike");
const slugify = require("../utils/slugify");
const fs = require("fs").promises;
const path = require("path");
const cloudinary = require("../config/cloudinary");

class PetPostService {
  // Create new post
  async createPost(data, userId) {
    try {
      // console.log(data);
      // Validate data
      await this.validatePostData(data);

      // Auto create slug if not provided
      if (!data.slug) {
        data.slug = slugify(data.title);
      }

      // No need to upload again, just get path from uploaded file
      const postData = {
        ...data,
        thumbnail_image: data.thumbnail_image?.path,
        featured_image: data.featured_image?.path,
        author_id: userId,
      };

      // Create post
      const post = await PetPost.create(postData);
      return await PetPost.getDetail(post.id);
    } catch (error) {
      // Delete uploaded images if error
      if (data.thumbnail_image?.path)
        await this.deleteImage(data.thumbnail_image.path);
      if (data.featured_image?.path)
        await this.deleteImage(data.featured_image.path);
      throw error;
    }
  }

  // Delete post
  async deletePost(id, userId, isAdmin = false) {
    try {
      const post = await PetPost.getDetail(id);

      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      // Check if user has permission to delete
      if (!isAdmin && !(await PetPost.isOwnedByUser(id, userId))) {
        throw new ApiError(
          403,
          "You do not have permission to delete this post"
        );
      }

      // Delete images
      if (post.thumbnail_image || post.featured_image) {
        await this.deletePostImages(post);
      }

      // Soft delete post instead of hard delete
      await PetPost.softDelete(id);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Delete multiple posts
  async deleteManyPosts(ids, userId, isAdmin = false) {
    try {
      // Get post details
      const posts = await Promise.all(ids.map((id) => PetPost.getDetail(id)));

      // Check permission and existence
      for (const post of posts) {
        if (!post) {
          throw new ApiError(404, "One or more posts do not exist");
        }
        if (!isAdmin && !(await PetPost.isOwnedByUser(post.id, userId))) {
          throw new ApiError(
            403,
            "You do not have permission to delete one or more posts"
          );
        }
      }

      // Delete images of all posts with images
      await Promise.all(
        posts
          .filter((post) => post.thumbnail_image || post.featured_image)
          .map((post) => this.deletePostImages(post))
      );

      // Soft delete all posts
      await PetPost.softDeleteMany(ids);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Helper method to delete images
  async deletePostImages(post) {
    try {
      const imagesToDelete = [post.thumbnail_image, post.featured_image].filter(
        Boolean
      );

      for (const imageUrl of imagesToDelete) {
        try {
          // Get public_id from cloudinary URL
          const publicId = imageUrl.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`petposts/${publicId}`);
          // console.log(`Deleted image: ${imageUrl}`);
        } catch (err) {
          console.error(`Error deleting image ${imageUrl}:`, err);
        }
      }
    } catch (error) {
      console.error("Delete post images error:", error);
    }
  }

  // Helper method to check if file exists
  async fileExists(filePath) {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Handle like/unlike
  async toggleLike(postId, userId) {
    try {
      const post = await PetPost.getDetail(postId);
      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      const result = await PetPostLike.toggleLike(userId, postId);
      return {
        success: true,
        message: result ? "Liked post" : "Unliked post",
        hasLiked: result,
      };
    } catch (error) {
      throw error;
    }
  }

  // Add comment
  async addComment(postId, userId, data) {
    try {
      const post = await PetPost.getDetail(postId);
      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      if (!data.content?.trim()) {
        throw new ApiError(400, "Comment content cannot be empty");
      }

      // Check parent comment if it's a reply
      if (data.parent_id) {
        const parentComment = await PetPostComment.getDetail(data.parent_id);
        if (!parentComment || parentComment.post_id !== Number(postId)) {
          throw new ApiError(404, "Parent comment not found");
        }
      }

      const comment = await PetPostComment.create({
        post_id: Number(postId),
        user_id: Number(userId),
        content: data.content.trim(),
        parent_id: data.parent_id ? Number(data.parent_id) : null,
      });

      return comment;
    } catch (error) {
      throw error;
    }
  }

  // Validate post data
  async validatePostData(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate) {
      if (!data.title) errors.push("Post title is required");
      if (!data.content) errors.push("Post content is required");
      if (!data.post_type) errors.push("Post type is required");
      if (!data.thumbnail_image) errors.push("Thumbnail image is required");
      if (!data.featured_image) errors.push("Featured image is required");
    }

    if (data.title && data.title.trim().length < 10) {
      errors.push("Title must be at least 10 characters");
    }

    if (data.content && data.content.trim().length < 50) {
      errors.push("Content must be at least 50 characters");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Invalid data", errors);
    }
  }

  // Get list of posts
  async getPosts(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        tags,
        post_type,
        status = "PUBLISHED",
        author_id,
        hospital_id,
        sort_by,
        sort_order,
        search,
      } = options;

      let result;

      // If there is search query, use search method
      if (search) {
        result = await PetPost.search(search, {
          page: parseInt(page),
          limit: parseInt(limit),
          status,
        });
      } else {
        // Otherwise, use findAll method
        result = await PetPost.findAll({
          page: parseInt(page),
          limit: parseInt(limit),
          category,
          tags,
          postType: post_type,
          status,
          authorId: author_id,
          hospitalId: hospital_id,
          sortBy: sort_by,
          sortOrder: sort_order,
        });
      }

      return result;
    } catch (error) {
      console.error("Get posts error:", error);
      throw error;
    }
  }

  // Get post detail
  async getPostDetail(id) {
    try {
      const post = await PetPost.getDetail(id);

      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      // Get likes and comments count
      const [likesCount, commentsCount] = await Promise.all([
        PetPostLike.getPostLikesCount(id),
        PetPostComment.getPostCommentsCount(id),
      ]);

      return {
        ...post,
        likes_count: likesCount,
        comments_count: commentsCount,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get list of users who liked the post
  async getLikedUsers(postId, options = {}) {
    try {
      const post = await PetPost.getDetail(postId);
      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      return await PetPostLike.getLikedUsers(postId, options);
    } catch (error) {
      throw error;
    }
  }

  // Get comments of the post
  async getPostComments(postId, options = {}) {
    try {
      const post = await PetPost.getDetail(postId);
      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      return await PetPostComment.getPostComments(postId, options);
    } catch (error) {
      throw error;
    }
  }

  // Get replies of the comment
  async getCommentReplies(commentId, options = {}) {
    try {
      const comment = await PetPostComment.getDetail(commentId);
      if (!comment) {
        throw new ApiError(404, "Comment not found");
      }

      return await PetPostComment.getCommentReplies(commentId, options);
    } catch (error) {
      throw error;
    }
  }

  // Delete comment
  async deleteComment(commentId, userId, isAdmin = false) {
    try {
      const result = await PetPostComment.deleteWithReports(
        commentId,
        userId,
        isAdmin
      );

      if (!result) {
        throw new ApiError(500, "Cannot delete comment");
      }

      return true;
    } catch (error) {
      if (error.message === "Comment not found") {
        throw new ApiError(404, error.message);
      }
      if (
        error.message === "You do not have permission to delete this comment"
      ) {
        throw new ApiError(403, error.message);
      }
      throw error;
    }
  }

  // Update post status
  async updateStatus(postId, status, userId, isAdmin = false) {
    try {
      const post = await PetPost.getDetail(postId);
      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      // Kiểm tra quyền cập nhật
      if (!isAdmin && post.author_id !== userId) {
        throw new ApiError(
          403,
          "You do not have permission to update this post"
        );
      }

      // Validate status
      const validStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"];
      if (!validStatuses.includes(status)) {
        throw new ApiError(400, "Invalid status");
      }

      await PetPost.update(postId, { status });
      return await PetPost.getDetail(postId);
    } catch (error) {
      throw error;
    }
  }

  // Update post
  async updatePost(id, data, userId) {
    try {
      const post = await PetPost.getDetail(id);
      if (!post) {
        if (data.featured_image)
          await this.deleteImage(data.featured_image.path);
        if (data.thumbnail_image)
          await this.deleteImage(data.thumbnail_image.path);
        throw new ApiError(404, "Post not found");
      }

      if (!(await PetPost.isOwnedByUser(id, userId))) {
        if (data.featured_image)
          await this.deleteImage(data.featured_image.path);
        if (data.thumbnail_image)
          await this.deleteImage(data.thumbnail_image.path);
        throw new ApiError(
          403,
          "You do not have permission to update this post"
        );
      }

      await this.validatePostData(data, true);

      const updatedData = { ...data };

      // Handle new images (only get path from file object)
      if (data.featured_image) {
        // Delete old image
        if (post.featured_image) {
          await this.deleteImage(post.featured_image);
        }
        // Only save URL from path
        updatedData.featured_image = data.featured_image.path;
      }

      if (data.thumbnail_image) {
        // Delete old image
        if (post.thumbnail_image) {
          await this.deleteImage(post.thumbnail_image);
        }
        // Only save URL from path
        updatedData.thumbnail_image = data.thumbnail_image.path;
      }

      // Update other fields
      if (data.title && data.title !== post.title) {
        updatedData.slug = slugify(data.title);
      }

      if (data.status === "PUBLISHED" && post.status !== "PUBLISHED") {
        updatedData.published_at = new Date();
      }

      await PetPost.update(id, updatedData);
      return await PetPost.getDetail(id);
    } catch (error) {
      if (data.featured_image) await this.deleteImage(data.featured_image.path);
      if (data.thumbnail_image)
        await this.deleteImage(data.thumbnail_image.path);
      throw error;
    }
  }

  // Helper method to delete uploaded files
  async deleteUploadedFiles(files) {
    if (!files || files.length === 0) return;

    for (const file of files) {
      try {
        const publicId = file.filename.split(".")[0];
        await cloudinary.uploader.destroy(`petposts/${publicId}`);
      } catch (err) {
        console.error(`Error deleting file ${file.filename}:`, err);
      }
    }
  }

  // Helper method to delete old image
  async deleteImage(imageUrl) {
    if (!imageUrl) return;

    try {
      const publicId = imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`petposts/${publicId}`);
    } catch (err) {
      console.error(`Error deleting image ${imageUrl}:`, err);
    }
  }

  // Add method to upload image to cloud
  async uploadToCloud(file, folder = "petposts") {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: folder,
        resource_type: "auto",
      });
      return result.secure_url;
    } catch (error) {
      console.error("Upload to cloud error:", error);
      throw error;
    }
  }

  // Report comment
  async reportComment(commentId, reportData, userId) {
    try {
      // Check if comment exists
      const comment = await PetPostComment.getDetail(commentId);
      if (!comment) {
        throw new ApiError(404, "Comment not found");
      }

      // Check if user has reported this comment
      const hasReported = await PetPostComment.hasUserReported(
        userId,
        commentId
      );
      if (hasReported) {
        throw new ApiError(400, "You have already reported this comment");
      }

      // Add reporter information
      const reportWithUser = {
        reported_by: userId,
        reason: reportData.reason || "No reason",
      };

      // Perform report
      const result = await PetPostComment.report(commentId, reportWithUser);

      return {
        success: true,
        message: "Reported comment successfully",
        data: result,
      };
    } catch (error) {
      console.error("Report comment error:", error);
      throw error;
    }
  }

  // Soft delete post
  async softDeletePost(id, userId, isAdmin = false) {
    try {
      const post = await PetPost.getDetail(id);

      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      // Check if user has permission to delete
      if (!isAdmin && !(await PetPost.isOwnedByUser(id, userId))) {
        throw new ApiError(
          403,
          "You do not have permission to delete this post"
        );
      }

      await PetPost.softDelete(id);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Hard delete post
  async hardDeletePost(id, userId, isAdmin = false) {
    try {
      const post = await PetPost.getDetail(id);

      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      // Check if user has permission to delete
      if (!isAdmin && !(await PetPost.isOwnedByUser(id, userId))) {
        throw new ApiError(
          403,
          "You do not have permission to delete this post"
        );
      }

      // Delete images before deleting post
      if (post.thumbnail_image || post.featured_image) {
        await this.deletePostImages(post);
      }

      // Delete post and related data
      await PetPost.hardDelete(id);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Soft delete multiple posts
  async softDeleteManyPosts(ids, userId, isAdmin = false) {
    try {
      // Check permission and existence
      for (const id of ids) {
        const post = await PetPost.getDetail(id);
        if (!post) {
          throw new ApiError(404, "One or more posts do not exist");
        }
        if (!isAdmin && !(await PetPost.isOwnedByUser(id, userId))) {
          throw new ApiError(
            403,
            "You do not have permission to delete one or more posts"
          );
        }
      }

      await PetPost.softDeleteMany(ids);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Hard delete multiple posts
  async hardDeleteManyPosts(ids, userId, isAdmin = false) {
    try {
      // Get post details
      const posts = await Promise.all(ids.map((id) => PetPost.getDetail(id)));

      // Check permission and existence
      for (const post of posts) {
        if (!post) {
          throw new ApiError(404, "One or more posts do not exist");
        }
        if (!isAdmin && !(await PetPost.isOwnedByUser(post.id, userId))) {
          throw new ApiError(
            403,
            "You do not have permission to delete one or more posts"
          );
        }
      }

      // Delete images of all posts with images
      await Promise.all(
        posts
          .filter((post) => post.thumbnail_image || post.featured_image)
          .map((post) => this.deletePostImages(post))
      );

      // Delete post and related data
      await PetPost.hardDeleteMany(ids);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Toggle soft delete status
  async toggleSoftDelete(id, userId, isAdmin = false) {
    try {
      const post = await PetPost.getDetail(id);

      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      // Check if user has permission
      if (!isAdmin && !(await PetPost.isOwnedByUser(id, userId))) {
        throw new ApiError(
          403,
          "You do not have permission to change the status of this post"
        );
      }

      await PetPost.toggleSoftDelete(id);

      // Get new status after toggle
      const updatedPost = await PetPost.getDetail(id);
      return {
        is_deleted: updatedPost.is_deleted,
        message: updatedPost.is_deleted ? "Post deleted" : "Post restored",
      };
    } catch (error) {
      throw error;
    }
  }

  // Get all blogs without filter
  async getAllBlogs() {
    try {
      const result = await PetPost.getAllBlogs();
      return result;
    } catch (error) {
      console.error("Get all blogs service error:", error);
      throw new ApiError(500, "Error fetching blogs");
    }
  }

  // Get soft deleted blogs
  async getSoftDeletedBlogs() {
    try {
      const result = await PetPost.getSoftDeletedBlogs();
      return result;
    } catch (error) {
      console.error("Get soft deleted blogs service error:", error);
      throw new ApiError(500, "Error fetching soft deleted blogs");
    }
  }
}

module.exports = new PetPostService();
