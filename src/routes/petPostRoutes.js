const express = require("express");
const PetPostController = require("../controllers/PetPostController");
const { validateAuth } = require("../middleware/validateAuth");
const { handleUploadPetPostImages } = require("../middleware/uploadMiddleware");

const router = express.Router();

// Routes công khai - không cần đăng nhập
router.get("/", PetPostController.getPosts);
router.get("/:id", PetPostController.getPostDetail);
router.get("/:id/comments", PetPostController.getComments);
router.get("/:id/likes", PetPostController.getLikedUsers);
router.get("/comments/:commentId/replies", PetPostController.getCommentReplies);

// Routes yêu cầu đăng nhập
router.use(validateAuth(["GENERAL_USER", "HOSPITAL_ADMIN", "ADMIN"]));

// Tương tác cơ bản - cho tất cả user đã đăng nhập
router.post("/:id/like", PetPostController.toggleLike);
router.post("/:id/comments", PetPostController.addComment);
router.delete("/comments/:commentId", PetPostController.deleteComment);

// Tạo router riêng cho admin routes
const adminRouter = express.Router();

// Routes admin
adminRouter.post("/", handleUploadPetPostImages, PetPostController.createPost);
adminRouter.put(
  "/:id",
  handleUploadPetPostImages,
  PetPostController.updatePost
);
adminRouter.patch("/:id/status", PetPostController.updateStatus);
adminRouter.delete("/:id", PetPostController.deletePost);

// Áp dụng middleware admin và mount admin router
router.use("/admin", validateAuth(["ADMIN"]), adminRouter);

module.exports = router;
