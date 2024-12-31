const express = require("express");
const PetGalleryController = require("../controllers/PetGalleryController");
const { validateAuth } = require("../middleware/validateAuth");
const {
  handleUploadPetGalleryImages,
} = require("../middleware/uploadMiddleware");

const router = express.Router();

// Routes công khai - không cần đăng nhập
router.get("/posts", PetGalleryController.getPosts);
router.get("/posts/:id", PetGalleryController.getPostDetail);
router.get("/posts/:id/comments", PetGalleryController.getComments);
router.get(
  "/comments/:commentId/replies",
  PetGalleryController.getCommentReplies
);

// Routes yêu cầu đăng nhập (tất cả các roles)
router.use(validateAuth(["GENERAL_USER", "HOSPITAL_ADMIN", "ADMIN"]));

// Tương tác cơ bản - cho tất cả user đã đăng nhập
router.post("/posts/:id/like", PetGalleryController.toggleLike);
router.post("/posts/:id/comments", PetGalleryController.addComment);

// Quản lý bài đăng của chính mình - cho tất cả user đã đăng nhập
router.post(
  "/posts",
  handleUploadPetGalleryImages,
  PetGalleryController.createPost
);

// Chỉ cho phép user sửa/xóa bài đăng của chính mình
// (Controller sẽ kiểm tra user_id)
router.put(
  "/posts/:id",
  handleUploadPetGalleryImages,
  PetGalleryController.updatePost
);

router.delete("/posts/:id", PetGalleryController.deletePost);

// Chỉ cho phép user xóa comment của chính mình
// (Controller sẽ kiểm tra user_id)
router.delete("/comments/:commentId", PetGalleryController.deleteComment);

// Routes đặc biệt cho ADMIN
router.use("/admin", validateAuth(["ADMIN"]));

// Admin có thể xóa bất kỳ bài đăng nào
router.delete("/admin/posts/:id", PetGalleryController.deletePost);

// Admin có thể xóa bất kỳ comment nào
router.delete("/admin/comments/:commentId", PetGalleryController.deleteComment);

module.exports = router;
