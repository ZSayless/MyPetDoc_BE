const express = require("express");
const PetGalleryController = require("../controllers/PetGalleryController");
const { validateAuth } = require("../middleware/validateAuth");
const {
  handleUploadPetGalleryImages,
} = require("../middleware/uploadMiddleware");
const cacheMiddleware = require("../middleware/cacheMiddleware");

const router = express.Router();

// Public routes (no need to login)
router.get("/posts", cacheMiddleware(300), PetGalleryController.getPosts);
router.get(
  "/posts/:slug",
  cacheMiddleware(300),
  PetGalleryController.getPostDetail
);
router.get(
  "/posts/:id/comments",
  cacheMiddleware(30),
  PetGalleryController.getComments
);
router.get(
  "/comments/:commentId/replies",
  cacheMiddleware(30),
  PetGalleryController.getCommentReplies
);

// Routes require login (all roles)
router.use(validateAuth(["GENERAL_USER", "HOSPITAL_ADMIN", "ADMIN"]));

// Basic interactions - for all logged in users
router.post("/posts/:id/like", PetGalleryController.toggleLike);
router.post("/posts/:id/comments", PetGalleryController.addComment);
// Check if user has liked post
router.get("/posts/:id/like/check", PetGalleryController.checkUserLikedPost);
// Add report comment route
router.post("/comments/:commentId/report", PetGalleryController.reportComment);

// Manage own posts - for all logged in users
router.post(
  "/posts",
  handleUploadPetGalleryImages,
  PetGalleryController.createPost
);

// Only allow users and admin to edit/delete their own posts
router.delete("/posts/:id", PetGalleryController.deletePost);

// Only allow users to delete their own comments and admin to delete any comment
// (Controller will check user_id)
router.delete("/comments/:commentId", PetGalleryController.deleteComment);

// Admin route to update post status
router.patch(
  "/admin/posts/:id/status",
  validateAuth(["ADMIN"]),
  PetGalleryController.updateStatus
);

// Admin route to get all posts without status filter
router.get(
  "/admin/posts/all",
  validateAuth(["ADMIN"]),
  PetGalleryController.getAllPosts
);

module.exports = router;
