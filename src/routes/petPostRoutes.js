const express = require("express");
const PetPostController = require("../controllers/PetPostController");
const { validateAuth } = require("../middleware/validateAuth");
const { handleUploadPetPostImages } = require("../middleware/uploadMiddleware");
const cacheMiddleware = require("../middleware/cacheMiddleware");

const router = express.Router();

// Public routes (no need to login)
router.get("/", cacheMiddleware(300), PetPostController.getPosts);
router.get("/:id", cacheMiddleware(300), PetPostController.getPostDetail);
router.get(
  "/:id/comments",
  cacheMiddleware(300),
  PetPostController.getComments
);
router.get("/:id/likes", cacheMiddleware(300), PetPostController.getLikedUsers);
router.get(
  "/comments/:commentId/replies",
  cacheMiddleware(300),
  PetPostController.getCommentReplies
);

// Routes require login
router.use(validateAuth(["GENERAL_USER", "HOSPITAL_ADMIN", "ADMIN"]));

// Basic interactions - for all logged in users
router.post("/:id/like", PetPostController.toggleLike);
router.post("/:id/comments", PetPostController.addComment);
router.delete("/comments/:commentId", PetPostController.deleteComment);

// Add report comment route
router.post(
  "/comments/:commentId/report",
  validateAuth(["GENERAL_USER", "HOSPITAL_ADMIN", "ADMIN"]),
  PetPostController.reportComment
);

// Create separate router for admin routes
const adminRouter = express.Router();

// Routes admin
adminRouter.post("/", handleUploadPetPostImages, PetPostController.createPost);
adminRouter.put(
  "/:id",
  handleUploadPetPostImages,
  PetPostController.updatePost
);
adminRouter.patch("/:id/status", PetPostController.updateStatus);

// Add soft delete routes
adminRouter.delete("/:id", PetPostController.softDeletePost);
adminRouter.delete("/batch/soft", PetPostController.softDeleteManyPosts);

// Add hard delete routes (only for ADMIN)
adminRouter.delete("/hard/:id", PetPostController.hardDeletePost);
adminRouter.delete("/batch/hard", PetPostController.hardDeleteManyPosts);

// Add toggle soft delete route (only for ADMIN)
adminRouter.patch("/:id/toggle-delete", PetPostController.toggleSoftDelete);

// Apply admin middleware and mount admin router
router.use("/admin", validateAuth(["ADMIN"]), adminRouter);

module.exports = router;
