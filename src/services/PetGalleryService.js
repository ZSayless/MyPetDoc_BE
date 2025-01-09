const ApiError = require("../exceptions/ApiError");
const PetGallery = require("../models/PetGallery");
const PetGalleryComment = require("../models/PetGalleryComment");
const PetGalleryLike = require("../models/PetGalleryLike");
const cloudinary = require("../config/cloudinary");

class PetGalleryService {
  // Tạo bài đăng mới
  async createPost(data, userId, file = null) {
    try {
      // Validate dữ liệu
      await this.validatePostData(data, file);

      // Chuẩn bị dữ liệu bài đăng
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

      // Tạo bài đăng
      const post = await PetGallery.create(postData);
      return post;
    } catch (error) {
      // Nếu có lỗi và đã upload ảnh, xóa ảnh trên Cloudinary
      if (file && file.path) {
        try {
          const urlParts = file.path.split("/");
          const publicId = `petgallerys/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Lỗi khi xóa ảnh trên Cloudinary:", deleteError);
        }
      }
      throw error;
    }
  }

  // Lấy danh sách bài đăng
  async getPosts(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        petType,
        tags,
        userId,
        sortBy = "created_at",
        sortOrder = "DESC",
      } = options;

      const result = await PetGallery.findAll({
        page,
        limit,
        petType,
        tags,
        userId,
        sortBy,
        sortOrder,
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  // Lấy chi tiết bài đăng
  async getPostDetail(id) {
    try {
      const post = await PetGallery.getDetail(id);
      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài đăng");
      }
      return post;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật bài đăng
  async updatePost(id, data, userId, file = null) {
    try {
      // Kiểm tra bài đăng tồn tại
      const post = await PetGallery.getDetail(id);
      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài đăng");
      }

      // Kiểm tra quyền sửa
      if (post.user_id !== userId) {
        throw new ApiError(403, "Bạn không có quyền sửa bài đăng này");
      }

      const updateData = {};
      if (data.caption) updateData.caption = data.caption;
      if (data.description) updateData.description = data.description;
      if (data.pet_type) updateData.pet_type = data.pet_type;
      if (data.tags) updateData.tags = data.tags;

      // Nếu có upload ảnh mới
      if (file) {
        // Xóa ảnh cũ trên Cloudinary nếu có
        if (post.image_url) {
          try {
            const urlParts = post.image_url.split("/");
            const publicId = `petgallerys/${
              urlParts[urlParts.length - 1].split(".")[0]
            }`;
            await cloudinary.uploader.destroy(publicId);
          } catch (deleteError) {
            console.error("Lỗi khi xóa ảnh cũ trên Cloudinary:", deleteError);
          }
        }
        updateData.image_url = file.path;
      }

      // Validate dữ liệu
      await this.validatePostData(updateData, file, true);

      // Cập nhật bài đăng
      const updatedPost = await PetGallery.update(id, updateData);

      // Kiểm tra kết quả cập nhật
      if (!updatedPost) {
        throw new ApiError(500, "Không thể cập nhật bài đăng");
      }

      return updatedPost;
    } catch (error) {
      // Nếu có lỗi và đã upload ảnh mới, xóa ảnh mới trên Cloudinary
      if (file && file.path) {
        try {
          const urlParts = file.path.split("/");
          const publicId = `petgallerys/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Lỗi khi xóa ảnh mới trên Cloudinary:", deleteError);
        }
      }
      throw error;
    }
  }

  // Xử lý like/unlike
  async toggleLike(postId, userId) {
    try {
      const post = await this.getPostDetail(postId);
      await PetGalleryLike.toggleLike(userId, postId);
      await PetGallery.updateCounts(postId);

      const hasLiked = await PetGalleryLike.hasUserLiked(userId, postId);
      return {
        success: true,
        message: hasLiked ? "Đã thích bài viết" : "Đã bỏ thích bài viết",
        hasLiked,
      };
    } catch (error) {
      throw error;
    }
  }

  // Thêm comment
  async addComment(postId, userId, data) {
    try {
      // Kiểm tra bài viết tồn tại
      const post = await PetGallery.getDetail(postId);
      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài đăng");
      }

      // Validate dữ liệu
      if (!data.content || !data.content.trim()) {
        throw new ApiError(400, "Nội dung bình luận không được để trống");
      }

      // Nếu là reply, kiểm tra comment gốc tồn tại
      if (data.parent_id) {
        const parentComment = await PetGalleryComment.getDetail(data.parent_id);
        if (!parentComment || parentComment.gallery_id !== Number(postId)) {
          throw new ApiError(404, "Không tìm thấy bình luận gốc");
        }
      }

      // Tạo comment mới
      const comment = await PetGalleryComment.create({
        gallery_id: Number(postId),
        user_id: Number(userId),
        content: data.content.trim(),
        parent_id: data.parent_id ? Number(data.parent_id) : null,
      });

      // Cập nhật số lượng comments trong bài viết
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

  // Xóa bài đăng
  async deletePost(id, userId, isAdmin = false) {
    try {
      const post = await PetGallery.getDetail(id);

      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài đăng");
      }

      // Kiểm tra quyền xóa
      if (!isAdmin && post.user_id !== userId) {
        throw new ApiError(403, "Bạn không có quyền xóa bài đăng này");
      }

      // Xóa ảnh trên Cloudinary nếu có
      if (post.image_url) {
        try {
          const urlParts = post.image_url.split("/");
          const publicId = `petgallerys/${
            urlParts[urlParts.length - 1].split(".")[0]
          }`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          console.error("Lỗi khi xóa ảnh trên Cloudinary:", deleteError);
        }
      }

      // Xóa likes và comments trước
      await this.deletePostDependencies(id);

      // Xóa bài đăng
      await PetGallery.hardDelete(id);

      return true;
    } catch (error) {
      console.error("Delete post error:", error);
      throw error;
    }
  }

  // Thêm phương thức hỗ trợ xóa các dependencies
  async deletePostDependencies(postId) {
    try {
      // Xóa likes
      const deleteLikesSql = `
        DELETE FROM pet_gallery_likes 
        WHERE gallery_id = ?
      `;

      // Xóa comments
      const deleteCommentsSql = `
        DELETE FROM pet_gallery_comments 
        WHERE gallery_id = ?
      `;

      await Promise.all([
        PetGallery.query(deleteLikesSql, [postId]),
        PetGallery.query(deleteCommentsSql, [postId]),
      ]);

      return true;
    } catch (error) {
      console.error("Delete post dependencies error:", error);
      throw error;
    }
  }

  // Validate dữ liệu bài đăng
  async validatePostData(data, file = null, isUpdate = false) {
    const errors = [];

    // Validate ảnh khi tạo mới
    if (!isUpdate && !file) {
      errors.push("Ảnh là bắt buộc");
    }

    // Validate caption
    if (!isUpdate && !data.caption) {
      errors.push("Tiêu đề là bắt buộc");
    } else if (data.caption && data.caption.trim().length < 5) {
      errors.push("Tiêu đề phải có ít nhất 5 ký tự");
    }

    // Validate description nếu có
    if (data.description && data.description.trim().length < 10) {
      errors.push("Mô tả phải có ít nhất 10 ký tự");
    }

    // Validate pet_type
    if (!isUpdate && !data.pet_type) {
      errors.push("Loại thú cưng là bắt buộc");
    } else if (
      data.pet_type &&
      !["DOG", "CAT", "OTHER"].includes(data.pet_type)
    ) {
      errors.push("Loại thú cưng không hợp lệ (DOG, CAT, OTHER)");
    }

    // Validate tags nếu có
    if (data.tags) {
      const tags = data.tags.split(",").map((tag) => tag.trim());
      if (tags.some((tag) => tag.length < 2)) {
        errors.push("Mỗi tag phải có ít nhất 2 ký tự");
      }
      if (tags.length > 5) {
        errors.push("Tối đa 5 tags cho mỗi bài đăng");
      }
    }

    // Validate file type và size nếu có file
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!allowedTypes.includes(file.mimetype)) {
        errors.push("Chỉ chấp nhận file ảnh (jpg, png, gif)");
      }
      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        errors.push("Kích thước ảnh không được vượt quá 5MB");
      }
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Dữ liệu không hợp lệ", errors);
    }
  }

  // Lấy comments của bài đăng
  async getPostComments(postId, options = {}) {
    try {
      // Kiểm tra bài đăng tồn tại
      const post = await PetGallery.getDetail(postId);
      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài đăng");
      }

      // Lấy danh sách comments
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

  // Lấy replies của comment
  async getCommentReplies(commentId, options = {}) {
    try {
      const page = Number(options.page || 1);
      const limit = Number(options.limit || 10);
      const offset = (page - 1) * limit;

      // Kiểm tra comment tồn tại
      const [comment] = await PetGalleryComment.query(
        "SELECT * FROM pet_gallery_comments WHERE id = ? AND is_deleted = 0",
        [Number(commentId)]
      );

      if (!comment) {
        throw new ApiError(404, "Không tìm thấy bình luận");
      }

      // Sử dụng string interpolation cho LIMIT và OFFSET
      const sql = `
        SELECT c.*, 
               u.full_name as user_name,
               u.avatar as user_avatar
        FROM pet_gallery_comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.parent_id = ? 
        AND c.is_deleted = 0
        ORDER BY c.created_at ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countSql = `
        SELECT COUNT(*) as total
        FROM pet_gallery_comments
        WHERE parent_id = ? 
        AND is_deleted = 0
      `;

      // Chỉ sử dụng prepared statement cho parent_id
      const [replies, [countResult]] = await Promise.all([
        PetGalleryComment.query(sql, [Number(commentId)]),
        PetGalleryComment.query(countSql, [Number(commentId)]),
      ]);

      return {
        comment_id: commentId,
        replies: replies.map((reply) => ({
          ...reply,
          is_deleted: Boolean(reply.is_deleted),
        })),
        pagination: {
          page: page,
          limit: limit,
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
        },
      };
    } catch (error) {
      console.error("Get comment replies error:", error);
      console.error("Error details:", {
        commentId,
        options,
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // Xóa comment
  async deleteComment(commentId, userId, isAdmin = false) {
    try {
      const result = await PetGalleryComment.deleteWithReports(
        commentId,
        userId,
        isAdmin
      );

      if (!result) {
        throw new ApiError(500, "Không thể xóa bình luận");
      }

      return true;
    } catch (error) {
      if (error.message === "Không tìm thấy bình luận") {
        throw new ApiError(404, error.message);
      }
      if (error.message === "Không có quyền xóa bình luận này") {
        throw new ApiError(403, error.message);
      }
      throw error;
    }
  }

  // Cập nhật số lượng comments của bài viết
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

  // Báo cáo comment
  async reportComment(commentId, reportData, userId) {
    try {
      // Kiểm tra comment tồn tại
      const [comment] = await PetGalleryComment.query(
        "SELECT * FROM pet_gallery_comments WHERE id = ? AND is_deleted = 0",
        [commentId]
      );

      if (!comment) {
        throw new ApiError(404, "Không tìm thấy bình luận");
      }

      // Kiểm tra user đã báo cáo comment này chưa
      const hasReported = await PetGalleryComment.hasUserReported(
        userId,
        commentId
      );
      if (hasReported) {
        throw new ApiError(400, "Bạn đã báo cáo bình luận này rồi");
      }

      // Thêm thông tin người báo cáo
      const reportWithUser = {
        reported_by: userId,
        reason: reportData.reason || "Không có lý do",
      };

      // Thực hiện báo cáo
      const result = await PetGalleryComment.report(commentId, reportWithUser);

      return {
        success: true,
        message: "Đã báo cáo bình luận thành công",
        data: result,
      };
    } catch (error) {
      console.error("Report comment error:", error);
      throw error;
    }
  }
}

module.exports = new PetGalleryService();
