const ApiError = require("../exceptions/ApiError");
const PetGallery = require("../models/PetGallery");
const PetGalleryComment = require("../models/PetGalleryComment");
const PetGalleryLike = require("../models/PetGalleryLike");
const cloudinary = require("../config/cloudinary");

class PetGalleryService {
  // Create new post
  async createPost(data, userId, file = null) {
    try {
      // Validate data
      await this.validatePostData(data, file);

      // Prepare post data
      const postData = {
        user_id: userId,
        caption: data.caption,
        description: data.description,
        pet_type: data.pet_type,
        tags: data.tags,
        image_url: file ? file.path : null,
        likes_count: 0,
        comments_count: 0,
      };

      // Create post
      const post = await PetGallery.create(postData);
      return post;
    } catch (error) {
      // If there is an error and an image has been uploaded, delete the image on Cloudinary
      if (file && file.path) {
        try {
          const urlParts = file.path.split("/");
          const publicId = `petgallerys/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting image on Cloudinary:", deleteError);
        }
      }
      throw error;
    }
  }

  // Get list of posts
  async getPosts(options = {}) {
    try {
      const { status = 'ACTIVE', ...otherOptions } = options;
      return await PetGallery.findAll({ status, ...otherOptions });
    } catch (error) {
      throw new ApiError(500, 'Error fetching posts');
    }
  }

  // Get post detail
  async getPostDetailBySlug(slug) {
    try {
      const post = await PetGallery.getDetailBySlug(slug);
      if (!post) {
        throw new ApiError(404, "Post not found");
      }
      return post;
    } catch (error) {
      throw error;
    }
  }

  // Update post
  async updatePost(id, data, userId, file = null) {
    try {
      // Check if post exists
      const post = await PetGallery.getDetail(id);
      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      const updateData = {};
      if (data.caption) updateData.caption = data.caption;
      if (data.description) updateData.description = data.description;
      if (data.pet_type) updateData.pet_type = data.pet_type;
      if (data.tags) updateData.tags = data.tags;

      // If new image is uploaded
      if (file) {
        // Delete old image on Cloudinary if any
        if (post.image_url) {
          try {
            const urlParts = post.image_url.split("/");
            const publicId = `petgallerys/${
              urlParts[urlParts.length - 1].split(".")[0]
            }`;
            await cloudinary.uploader.destroy(publicId);
          } catch (deleteError) {
            console.error("Error deleting old image on Cloudinary:", deleteError);
          }
        }
        updateData.image_url = file.path;
      }

      // Validate data
      await this.validatePostData(updateData, file, true);

      // Update post
      const updatedPost = await PetGallery.update(id, updateData);

      // Check if update is successful
      if (!updatedPost) {
        throw new ApiError(500, "Cannot update post");
      }

      return updatedPost;
    } catch (error) {
      // If there is an error and a new image has been uploaded, delete the new image on Cloudinary
      if (file && file.path) {
        try {
          const urlParts = file.path.split("/");
          const publicId = `petgallerys/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting new image on Cloudinary:", deleteError);
        }
      }
      throw error;
    }
  }

  // Check if user has liked post
  async checkUserLikedPost(postId, userId) {
    try {
      // Kiểm tra tham số
      if (!postId || !userId) {
        throw new ApiError(400, "Missing required parameters");
      }

      const hasLiked = await PetGalleryLike.hasUserLiked(userId, postId);
      return {
        success: true,
        message: "Check user liked post successful",
        data: {
          hasLiked,
        },
      };
    } catch (error) {
      console.error("Check user liked post error:", error);
      throw error;
    }
  }

  // Handle like/unlike
  async toggleLike(postId, userId) {
    try {
      // Kiểm tra tham số
      if (!postId || !userId) {
        throw new ApiError(400, "Missing required parameters");
      }

      await PetGalleryLike.toggleLike(userId, postId);
      await PetGallery.updateCounts(postId);

      const hasLiked = await PetGalleryLike.hasUserLiked(userId, postId);
      return {
        success: true,
        message: hasLiked ? "Liked post" : "Unliked post",
        hasLiked,
      };
    } catch (error) {
      console.error("Toggle like error:", error);
      throw error;
    }
  }

  // Add comment
  async addComment(postId, userId, data) {
    try {
      // Check if post exists
      const post = await PetGallery.getDetail(postId);
      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      // Validate data
      if (!data.content || !data.content.trim()) {
        throw new ApiError(400, "Comment content cannot be empty");
      }

      // If it is a reply, check if the parent comment exists
      if (data.parent_id) {
        const parentComment = await PetGalleryComment.getDetail(data.parent_id);
        if (!parentComment || parentComment.gallery_id !== Number(postId)) {
          throw new ApiError(404, "Parent comment not found");
        }
      }

      // Create new comment
      const comment = await PetGalleryComment.create({
        gallery_id: Number(postId),
        user_id: Number(userId),
        content: data.content.trim(),
        parent_id: data.parent_id ? Number(data.parent_id) : null,
      });

      // Update comment count in post
      await this.updatePostCommentCount(postId);

      return comment;
    } catch (error) {
      console.error("Create comment error:", error);
      console.error("Error details:", {
        postId,
        userId,
        data,
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // Delete post
  async deletePost(id, userId, isAdmin = false) {
    try {
      const post = await PetGallery.getDetail(id);

      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      // Check if user has permission to delete
      if (!isAdmin && post.user_id !== userId) {
        throw new ApiError(403, "You do not have permission to delete this post");
      }

      // Delete image on Cloudinary if any
      if (post.image_url) {
        try {
          const urlParts = post.image_url.split("/");
          const publicId = `petgallerys/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Error deleting image on Cloudinary:", deleteError);
        }
      }

      // Delete post and all related data
      await PetGallery.delete(id);

      return true;
    } catch (error) {
      console.error("Delete post error:", error);
      throw error;
    }
  }

  // Validate post data
  async validatePostData(data, file = null, isUpdate = false) {
    const errors = [];

    // Validate image when creating new
    if (!isUpdate && !file) {
      errors.push("Image is required");
    }

    // Validate caption
    if (!isUpdate && !data.caption) {
      errors.push("Title is required");
    } else if (data.caption && data.caption.trim().length < 5) {
      errors.push("Title must be at least 5 characters");
    }

    // Validate description if any
    if (data.description && data.description.trim().length < 10) {
      errors.push("Description must be at least 10 characters");
    }

    // Validate pet_type
    if (!isUpdate && !data.pet_type) {
      errors.push("Pet type is required");
    } else if (
      data.pet_type &&
      !["DOG", "CAT","BIRD", "OTHER"].includes(data.pet_type)
    ) {
      errors.push("Invalid pet type (DOG, CAT, OTHER)");
    }

    // Validate tags if any
    if (data.tags) {
      const tags = data.tags.split(",").map((tag) => tag.trim());
      if (tags.some((tag) => tag.length < 1)) {
        errors.push("Each tag must be at least 1 characters");
      }
      if (tags.length > 10) {
        errors.push("Maximum 10 tags per post");
      }
    }

    // Validate file type and size if any
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!allowedTypes.includes(file.mimetype)) {
        errors.push("Only image files (jpg, png, gif) are accepted");
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push("Image size must be less than 10MB");
      }
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Invalid data", errors);
    }
  }

  // Get comments of post
  async getPostComments(postId, options = {}) {
    try {
      // Check if post exists
      const post = await PetGallery.getDetail(postId);
      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      // Get list of comments
      const result = await PetGalleryComment.getPostComments(postId, options);

      return {
        post_id: postId,
        ...result,
      };
    } catch (error) {
      console.error("Get post comments error:", error);
      throw error;
    }
  }

  // Get replies of comment
  async getCommentReplies(commentId, options = {}) {
    try {
      // Check input parameters
      if (!commentId) {
        throw new ApiError(400, "Comment ID is required");
      }

      // Check if comment exists
      const comment = await PetGalleryComment.getDetail(commentId);
      if (!comment) {
        throw new ApiError(404, "Comment not found");
      }
  
      // Call model to get data
      const result = await PetGalleryComment.getReplies(commentId, options);
  
      return {
        comment_id: commentId,
        ...result
      };
    } catch (error) {
      console.error("Get replies service error:", error);
      throw error;
    }
  }

  // Delete comment
  async deleteComment(commentId, userId, isAdmin = false) {
    try {
      const result = await PetGalleryComment.deleteWithReports(
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
      if (error.message === "You do not have permission to delete this comment") {
        throw new ApiError(403, error.message);
      }
      throw error;
    }
  }

  // Update comment count of post
  async updatePostCommentCount(galleryId) {
    try {
      const sql = `
        UPDATE pet_gallery
        SET comments_count = (
          SELECT COUNT(*)
          FROM pet_gallery_comments
          WHERE gallery_id = ?
          AND is_deleted = 0
        )
        WHERE id = ?
      `;

      await PetGallery.query(sql, [Number(galleryId), Number(galleryId)]);
      return true;
    } catch (error) {
      console.error("Update post comment count error:", error);
      throw error;
    }
  }

  // Report comment
  async reportComment(commentId, reportData, userId) {
    try {
      // Check if comment exists
      const [comment] = await PetGalleryComment.query(
        "SELECT * FROM pet_gallery_comments WHERE id = ? AND is_deleted = 0",
        [commentId]
      );

      if (!comment) {
        throw new ApiError(404, "Comment not found");
      }

      // Check if user has reported this comment
      const hasReported = await PetGalleryComment.hasUserReported(
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
      const result = await PetGalleryComment.report(commentId, reportWithUser);

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

  async deleteGallery(galleryId, userId, isAdmin = false) {
    try {
      // Check if gallery exists
      const gallery = await PetGallery.findById(galleryId);
      if (!gallery) {
        throw new ApiError(404, "Gallery not found");
      }

      // Check if user has permission to delete
      if (!isAdmin && gallery.user_id !== userId) {
        throw new ApiError(403, "You do not have permission to delete this post");
      }

      // Delete gallery and all related data
      await PetGallery.delete(galleryId);

      return {
        status: "success",
        message: "Deleted post successfully",
      };
    } catch (error) {
      console.error("Delete gallery error:", error);
      throw error;
    }
  }

  // Thêm method updateStatus
  async updateStatus(id, status, userId, isAdmin = false) {
    try {
      // Check post exists
      const post = await PetGallery.getDetail(id);
      if (!post) {
        throw new ApiError(404, 'Post not found');
      }

      // Check permission
      if (!isAdmin && post.user_id !== userId) {
        throw new ApiError(403, 'You do not have permission');
      }

      // Validate status
      if (!['ACTIVE', 'INACTIVE'].includes(status)) {
        throw new ApiError(400, 'Invalid status');
      }

      const updatedPost = await PetGallery.updateStatus(id, status);
      return updatedPost;
    } catch (error) {
      throw error;
    }
  }

  // Get all posts without status filter
  async getAllPosts(options = {}) {
    try {
      return await PetGallery.getAllPosts(options);
    } catch (error) {
      console.error("Get all posts service error:", error);
      throw new ApiError(500, "Error fetching all posts");
    }
  }
}

module.exports = new PetGalleryService();
