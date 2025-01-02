const ApiError = require("../exceptions/ApiError");
const PetPost = require("../models/PetPost");
const PetPostComment = require("../models/PetPostComment");
const PetPostLike = require("../models/PetPostLike");
const slugify = require("../utils/slugify");
const fs = require("fs").promises;
const path = require("path");

class PetPostService {
  // Tạo bài viết mới
  async createPost(data, userId) {
    try {
      // Validate dữ liệu
      await this.validatePostData(data);

      // Tự động tạo slug nếu không có
      if (!data.slug) {
        data.slug = slugify(data.title);
      }

      // Chuẩn bị dữ liệu bài viết
      const postData = {
        title: data.title,
        content: data.content,
        summary: data.summary,
        post_type: data.post_type,
        category: data.category,
        tags: data.tags,
        status: data.status || "DRAFT",
        author_id: userId,
        hospital_id: data.hospital_id,
        meta_title: data.meta_title,
        meta_description: data.meta_description,
        slug: data.slug,
        event_start_date: data.event_start_date,
        event_end_date: data.event_end_date,
        event_location: data.event_location,
        event_registration_link: data.event_registration_link,
        source: data.source,
        external_link: data.external_link,
        thumbnail_image: data.thumbnail_image,
        featured_image: data.featured_image,
      };

      // Tạo bài viết
      const post = await PetPost.create(postData);
      return await PetPost.getDetail(post.id);
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật bài viết
  async updatePost(id, data, userId) {
    try {
      const post = await PetPost.getDetail(id);

      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài viết");
      }

      // Kiểm tra quyền sửa
      if (!(await PetPost.isOwnedByUser(id, userId))) {
        throw new ApiError(403, "Bạn không có quyền sửa bài viết này");
      }

      // Tự động cập nhật slug nếu tiêu đề thay đổi và không có slug mới
      if (data.title && data.title !== post.title && !data.slug) {
        data.slug = slugify(data.title);
      }

      // Validate và cập nhật
      await this.validatePostData(data, true);
      await PetPost.update(id, data);
      return await PetPost.getDetail(id);
    } catch (error) {
      throw error;
    }
  }

  // Xóa bài viết
  async deletePost(id, userId, isAdmin = false) {
    try {
      const post = await PetPost.getDetail(id);

      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài viết");
      }

      // Kiểm tra quyền xóa
      if (!isAdmin && !(await PetPost.isOwnedByUser(id, userId))) {
        throw new ApiError(403, "Bạn không có quyền xóa bài viết này");
      }

      // Xóa ảnh
      await this.deletePostImages(post);

      // Xóa bài viết và các dữ liệu liên quan
      await PetPost.delete(id);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Xóa nhiều bài viết
  async deleteManyPosts(ids, userId, isAdmin = false) {
    try {
      // Lấy thông tin các bài viết
      const posts = await Promise.all(ids.map((id) => PetPost.getDetail(id)));

      // Kiểm tra quyền và tồn tại
      for (const post of posts) {
        if (!post) {
          throw new ApiError(404, "Một hoặc nhiều bài viết không tồn tại");
        }
        if (!isAdmin && !(await PetPost.isOwnedByUser(post.id, userId))) {
          throw new ApiError(
            403,
            "Bạn không có quyền xóa một hoặc nhiều bài viết"
          );
        }
      }

      // Xóa ảnh của tất cả bài viết
      await Promise.all(posts.map((post) => this.deletePostImages(post)));

      // Xóa các bài viết và dữ liệu liên quan
      await PetPost.deleteMany(ids);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Helper method để xóa ảnh
  async deletePostImages(post) {
    try {
      const imagesToDelete = [post.thumbnail_image, post.featured_image].filter(
        Boolean
      );

      await Promise.all(
        imagesToDelete.map(async (imagePath) => {
          try {
            // Lấy đường dẫn đầy đủ từ root của project
            const fullPath = path.join(process.cwd(), imagePath);
            if (await this.fileExists(fullPath)) {
              await fs.unlink(fullPath);
              console.log(`Đã xóa file: ${fullPath}`);
            }
          } catch (err) {
            console.error(`Lỗi khi xóa file ${imagePath}:`, err);
          }
        })
      );
    } catch (error) {
      console.error("Delete post images error:", error);
      // Không throw error để tiếp tục process
    }
  }

  // Helper method để kiểm tra file tồn tại
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Xử lý like/unlike
  async toggleLike(postId, userId) {
    try {
      const post = await PetPost.getDetail(postId);
      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài viết");
      }

      const result = await PetPostLike.toggleLike(userId, postId);
      return {
        success: true,
        message: result ? "Đã thích bài viết" : "Đã bỏ thích bài viết",
        hasLiked: result,
      };
    } catch (error) {
      throw error;
    }
  }

  // Thêm comment
  async addComment(postId, userId, data) {
    try {
      const post = await PetPost.getDetail(postId);
      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài viết");
      }

      if (!data.content?.trim()) {
        throw new ApiError(400, "Nội dung bình luận không được để trống");
      }

      // Kiểm tra parent comment nếu là reply
      if (data.parent_id) {
        const parentComment = await PetPostComment.getDetail(data.parent_id);
        if (!parentComment || parentComment.post_id !== Number(postId)) {
          throw new ApiError(404, "Không tìm thấy bình luận gốc");
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

  // Validate dữ liệu bài viết
  async validatePostData(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate) {
      if (!data.title) errors.push("Tiêu đề bài viết là bắt buộc");
      if (!data.content) errors.push("Nội dung bài viết là bắt buộc");
      if (!data.post_type) errors.push("Loại bài viết là bắt buộc");
      if (!data.thumbnail_image) errors.push("Ảnh thumbnail là bắt buộc");
      if (!data.featured_image) errors.push("Ảnh featured là bắt buộc");
    }

    if (data.title && data.title.trim().length < 10) {
      errors.push("Tiêu đề phải có ít nhất 10 ký tự");
    }

    if (data.content && data.content.trim().length < 50) {
      errors.push("Nội dung phải có ít nhất 50 ký tự");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Dữ liệu không hợp lệ", errors);
    }
  }

  async getPosts(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        tags,
        postType,
        status = "PUBLISHED",
        authorId,
        hospitalId,
        sortBy = "created_at",
        sortOrder = "DESC",
        search,
      } = options;

      // Nếu có search term, sử dụng search method
      if (search) {
        return await PetPost.search(search, {
          page,
          limit,
          status,
        });
      }

      // Nếu không có search, sử dụng findAll
      return await PetPost.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        category,
        tags,
        postType,
        status,
        authorId: authorId ? parseInt(authorId) : null,
        hospitalId: hospitalId ? parseInt(hospitalId) : null,
        sortBy,
        sortOrder,
      });
    } catch (error) {
      console.error("Get posts error:", error);
      throw error;
    }
  }

  // Lấy chi tiết bài viết
  async getPostDetail(id) {
    try {
      const post = await PetPost.getDetail(id);

      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài viết");
      }

      // Lấy thêm thông tin likes và comments
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

  // Lấy danh sách người dùng đã like bài viết
  async getLikedUsers(postId, options = {}) {
    try {
      const post = await PetPost.getDetail(postId);
      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài viết");
      }

      return await PetPostLike.getLikedUsers(postId, options);
    } catch (error) {
      throw error;
    }
  }

  // Lấy comments của bài viết
  async getPostComments(postId, options = {}) {
    try {
      const post = await PetPost.getDetail(postId);
      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài viết");
      }

      return await PetPostComment.getPostComments(postId, options);
    } catch (error) {
      throw error;
    }
  }

  // Lấy replies của comment
  async getCommentReplies(commentId, options = {}) {
    try {
      const comment = await PetPostComment.getDetail(commentId);
      if (!comment) {
        throw new ApiError(404, "Không tìm thấy bình luận");
      }

      return await PetPostComment.getCommentReplies(commentId, options);
    } catch (error) {
      throw error;
    }
  }

  // Xóa comment
  async deleteComment(commentId, userId, isAdmin = false) {
    try {
      const comment = await PetPostComment.getDetail(commentId);
      if (!comment) {
        throw new ApiError(404, "Không tìm thấy bình luận");
      }

      // Kiểm tra quyền xóa
      if (!isAdmin && comment.user_id !== userId) {
        throw new ApiError(403, "Bạn không có quyền xóa bình luận này");
      }

      await PetPostComment.delete(commentId);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật trạng thái bài viết
  async updateStatus(postId, status, userId, isAdmin = false) {
    try {
      const post = await PetPost.getDetail(postId);
      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài viết");
      }

      // Kiểm tra quyền cập nhật
      if (!isAdmin && post.author_id !== userId) {
        throw new ApiError(403, "Bạn không có quyền cập nhật bài viết này");
      }

      // Validate status
      const validStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"];
      if (!validStatuses.includes(status)) {
        throw new ApiError(400, "Trạng thái không hợp lệ");
      }

      await PetPost.update(postId, { status });
      return await PetPost.getDetail(postId);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PetPostService();
