const express = require("express");
const router = express.Router();
const FavoriteController = require("../controllers/FavoriteController");
const { validateAuth } = require("../middleware/validateAuth");

// All routes require login
router.use(validateAuth());

// Toggle favorite a hospital
router.post("/:hospitalId", FavoriteController.toggleFavorite);

// Check if user has favorited a hospital
router.get("/check/:hospitalId", FavoriteController.checkUserFavorite);

// Get list of hospitals favorited by current user
router.get("/user/hospitals", FavoriteController.getUserFavorites);

// Get count of favorites of current user
router.get("/user/count", FavoriteController.getUserFavoriteCount);

// Public routes (still require login)
router.use(validateAuth(["ADMIN", "HOSPITAL_ADMIN"]));
// Get list of users who have favorited a hospital
router.get(
  "/hospital/:hospitalId/users",
  FavoriteController.getHospitalFavorites
);

// Get count of favorites of a hospital
router.get(
  "/hospital/:hospitalId/count",
  FavoriteController.getHospitalFavoriteCount
);

// Get list of latest favorites (can limit admin permission if needed)
router.get("/latest", FavoriteController.getLatestFavorites);

module.exports = router;
