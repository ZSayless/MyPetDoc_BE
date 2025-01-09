const ApiError = require("../exceptions/ApiError");
const PetPost = require("../models/PetPost");
const PetPostComment = require("../models/PetPostComment");
const PetPostLike = require("../models/PetPostLike");
const slugify = require("../utils/slugify");
const fs = require("fs").promises;
const path = require("path");
const cloudinary = require("../config/cloudinary");

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

      // Không cần upload lại, chỉ cần lấy path từ file đã upload
      const postData = {
        ...data,
        thumbnail_image: data.thumbnail_image?.path,
        featured_image: data.featured_image?.path,
        author_id: userId,
      };

      // Tạo bài viết
      const post = await PetPost.create(postData);
      return await PetPost.getDetail(post.id);
    } catch (error) {
      // Xóa ảnh đã upload nếu có lỗi
      if (data.thumbnail_image?.path)
        await this.deleteImage(data.thumbnail_image.path);
      if (data.featured_image?.path)
        await this.deleteImage(data.featured_image.path);
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

      for (const imageUrl of imagesToDelete) {
        try {
          // Lấy public_id từ URL cloudinary
          const publicId = imageUrl.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`petposts/${publicId}`);
          console.log(`Đã xóa ảnh: ${imageUrl}`);
        } catch (err) {
          console.error(`Lỗi khi xóa ảnh ${imageUrl}:`, err);
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
      const result = await PetPostComment.deleteWithReports(
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
  async updatePost(id, data, userId) {
    try {
      const post = await PetPost.getDetail(id);
      if (!post) {
        if (data.featured_image)
          await this.deleteImage(data.featured_image.path);
        if (data.thumbnail_image)
          await this.deleteImage(data.thumbnail_image.path);
        throw new ApiError(404, "Không tìm thấy bài viết");
      }

      if (!(await PetPost.isOwnedByUser(id, userId))) {
        if (data.featured_image)
          await this.deleteImage(data.featured_image.path);
        if (data.thumbnail_image)
          await this.deleteImage(data.thumbnail_image.path);
        throw new ApiError(403, "Bạn không có quyền cập nhật bài viết này");
      }

      await this.validatePostData(data, true);

      const updatedData = { ...data };

      // Xử lý ảnh mới (chỉ lấy path từ object file)
      if (data.featured_image) {
        // Xóa ảnh cũ
        if (post.featured_image) {
          await this.deleteImage(post.featured_image);
        }
        // Chỉ lưu URL từ path
        updatedData.featured_image = data.featured_image.path;
      }

      if (data.thumbnail_image) {
        // Xóa ảnh cũ
        if (post.thumbnail_image) {
          await this.deleteImage(post.thumbnail_image);
        }
        // Chỉ lưu URL từ path
        updatedData.thumbnail_image = data.thumbnail_image.path;
      }

      // Cập nhật các trường khác
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

  // Helper method để xóa các files đã upload
  async deleteUploadedFiles(files) {
    if (!files || files.length === 0) return;

    for (const file of files) {
      try {
        const publicId = file.filename.split(".")[0];
        await cloudinary.uploader.destroy(`petposts/${publicId}`);
      } catch (err) {
        console.error(`Lỗi khi xóa file ${file.filename}:`, err);
      }
    }
  }

  // Helper method để xóa ảnh cũ
  async deleteImage(imageUrl) {
    if (!imageUrl) return;

    try {
      const publicId = imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`petposts/${publicId}`);
    } catch (err) {
      console.error(`Lỗi khi xóa ảnh ${imageUrl}:`, err);
    }
  }

  // Thêm phương thức upload ảnh lên cloud
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

  // Báo cáo comment
  async reportComment(commentId, reportData, userId) {
    try {
      // Kiểm tra comment tồn tại
      const comment = await PetPostComment.getDetail(commentId);
      if (!comment) {
        throw new ApiError(404, "Không tìm thấy bình luận");
      }

      // Kiểm tra user đã báo cáo comment này chưa
      const hasReported = await PetPostComment.hasUserReported(
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
      const result = await PetPostComment.report(commentId, reportWithUser);

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

  // Xóa mềm bài viết
  async softDeletePost(id, userId, isAdmin = false) {
    try {
      const post = await PetPost.getDetail(id);

      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài viết");
      }

      // Kiểm tra quyền xóa
      if (!isAdmin && !(await PetPost.isOwnedByUser(id, userId))) {
        throw new ApiError(403, "Bạn không có quyền xóa bài viết này");
      }

      await PetPost.softDelete(id);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Xóa cứng bài viết
  async hardDeletePost(id, userId, isAdmin = false) {
    try {
      const post = await PetPost.getDetail(id);

      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài viết");
      }

      // Kiểm tra quyền xóa
      if (!isAdmin && !(await PetPost.isOwnedByUser(id, userId))) {
        throw new ApiError(403, "Bạn không có quyền xóa bài viết này");
      }

      // Xóa ảnh trước
      if (post.thumbnail_image || post.featured_image) {
        await this.deletePostImages(post);
      }

      // Xóa bài viết và dữ liệu liên quan
      await PetPost.hardDelete(id);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Xóa mềm nhiều bài viết
  async softDeleteManyPosts(ids, userId, isAdmin = false) {
    try {
      // Kiểm tra quyền và tồn tại
      for (const id of ids) {
        const post = await PetPost.getDetail(id);
        if (!post) {
          throw new ApiError(404, "Một hoặc nhiều bài viết không tồn tại");
        }
        if (!isAdmin && !(await PetPost.isOwnedByUser(id, userId))) {
          throw new ApiError(
            403,
            "Bạn không có quyền xóa một hoặc nhiều bài viết"
          );
        }
      }

      await PetPost.softDeleteMany(ids);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Xóa cứng nhiều bài viết
  async hardDeleteManyPosts(ids, userId, isAdmin = false) {
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

      // Xóa bài viết và dữ liệu liên quan
      await PetPost.hardDeleteMany(ids);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Toggle trạng thái xóa mềm
  async toggleSoftDelete(id, userId, isAdmin = false) {
    try {
      const post = await PetPost.getDetail(id);

      if (!post) {
        throw new ApiError(404, "Không tìm thấy bài viết");
      }

      // Kiểm tra quyền
      if (!isAdmin && !(await PetPost.isOwnedByUser(id, userId))) {
        throw new ApiError(
          403,
          "Bạn không có quyền thay đổi trạng thái bài viết này"
        );
      }

      await PetPost.toggleSoftDelete(id);

      // Lấy trạng thái mới sau khi toggle
      const updatedPost = await PetPost.getDetail(id);
      return {
        is_deleted: updatedPost.is_deleted,
        message: updatedPost.is_deleted
          ? "Đã xóa bài viết"
          : "Đã khôi phục bài viết",
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PetPostService();
