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
      console.log(data);
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
      if (post.thumbnail_image || post.featured_image) {
        await this.deletePostImages(post);
      }

      // Soft delete bài viết thay vì xóa hoàn toàn
      await PetPost.softDelete(id);
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

      // Xóa ảnh của tất cả bài viết có ảnh
      await Promise.all(
        posts
          .filter((post) => post.thumbnail_image || post.featured_image)
          .map((post) => this.deletePostImages(post))
      );

      // Soft delete tất cả bài viết
      await PetPost.softDeleteMany(ids);
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

      for (const imageName of imagesToDelete) {
        try {
          const fullPath = path.join(
            process.cwd(),
            "uploads",
            "petposts",
            imageName
          );
          if (
            await fs
              .access(fullPath)
              .then(() => true)
              .catch(() => false)
          ) {
            await fs.unlink(fullPath);
            console.log(`Đã xóa file: ${fullPath}`);
          }
        } catch (err) {
          console.error(`Lỗi khi xóa file ${imageName}:`, err);
        }
      }
    } catch (error) {
      console.error("Delete post images error:", error);
    }
  }

  // Helper method để kiểm tra file tồn tại
  async fileExists(filePath) {
    try {
      await fs.promises.access(filePath);
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

  // Lấy danh sách bài viết
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

      // Nếu có search query thì dùng phương thức search
      if (search) {
        result = await PetPost.search(search, {
          page: parseInt(page),
          limit: parseInt(limit),
          status,
        });
      } else {
        // Ngược lại dùng findAll
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
      await PetPostComment.delete(commentId, userId, isAdmin);
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

  // Cập nhật bài viết
  async updatePost(id, data, userId, files = []) {
    try {
      // Kiểm tra bài viết tồn tại
      const post = await PetPost.getDetail(id);
      if (!post) {
        // Xóa ảnh mới đã upload nếu có
        await this.deleteUploadedFiles(files);
        throw new ApiError(404, "Không tìm thấy bài viết");
      }

      // Kiểm tra quyền cập nhật
      if (!(await PetPost.isOwnedByUser(id, userId))) {
        await this.deleteUploadedFiles(files);
        throw new ApiError(403, "Bạn không có quyền cập nhật bài viết này");
      }

      // Validate dữ liệu cập nhật
      await this.validatePostData(data, true);

      // Xử lý ảnh mới
      const updatedData = { ...data };
      if (files && files.length > 0) {
        // Cập nhật featured_image nếu có
        if (files[0]) {
          updatedData.featured_image = files[0].filename;
          await this.deleteImage(post.featured_image);
        }

        // Cập nhật thumbnail_image nếu có
        if (files[1]) {
          updatedData.thumbnail_image = files[1].filename;
          await this.deleteImage(post.thumbnail_image);
        }
      }

      // Tự động cập nhật slug nếu title thay đổi
      if (data.title && data.title !== post.title) {
        updatedData.slug = slugify(data.title);
      }

      // Cập nhật thời gian published_at nếu status chuyển sang PUBLISHED
      if (data.status === "PUBLISHED" && post.status !== "PUBLISHED") {
        updatedData.published_at = new Date();
      }

      // Cập nhật bài viết
      const updatedPost = await PetPost.update(id, updatedData);
      return await PetPost.getDetail(id);
    } catch (error) {
      // Xóa files đã upload nếu có lỗi
      await this.deleteUploadedFiles(files);
      throw error;
    }
  }

  // Helper method để xóa các files đã upload
  async deleteUploadedFiles(files) {
    if (!files || files.length === 0) return;

    for (const file of files) {
      try {
        const filePath = path.join(
          process.cwd(),
          "uploads",
          "petposts",
          file.filename
        );
        await fs.unlink(filePath);
      } catch (err) {
        console.error(`Lỗi khi xóa file ${file.filename}:`, err);
      }
    }
  }

  // Helper method để xóa ảnh cũ
  async deleteImage(filename) {
    if (!filename) return;

    try {
      const filePath = path.join(
        process.cwd(),
        "uploads",
        "petposts",
        filename
      );
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code !== "ENOENT") {
        console.error(`Lỗi khi xóa ảnh ${filename}:`, err);
      }
    }
  }
}

module.exports = new PetPostService();
