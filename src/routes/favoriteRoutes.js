const express = require("express");
const router = express.Router();
const FavoriteController = require("../controllers/FavoriteController");
const { validateAuth } = require("../middleware/validateAuth");
const cacheMiddleware = require("../middleware/cacheMiddleware");

// All routes require login
router.use(validateAuth());

// Toggle favorite a hospital
router.post("/:hospitalId", FavoriteController.toggleFavorite);

// Check if user has favorited a hospital
router.get(
  "/check/:hospitalId",
  cacheMiddleware(300),
  FavoriteController.checkUserFavorite
);

// Get list of hospitals favorited by current user
router.get(
  "/user/:userId/hospitals",
  cacheMiddleware(300),
  FavoriteController.getUserFavorites
);

// Get count of favorites of current user
router.get(
  "/user/:userId/count",
  cacheMiddleware(300),
  FavoriteController.getUserFavoriteCount
);

// Public routes (still require login)
router.use(validateAuth(["ADMIN", "HOSPITAL_ADMIN"]));

// Get list of users who have favorited a hospital
router.get(
  "/hospital/:hospitalId/users",
  cacheMiddleware(300),
  FavoriteController.getHospitalFavorites
);

// Get count of favorites of a hospital
router.get(
  "/hospital/:hospitalId/count",
  cacheMiddleware(300),
  FavoriteController.getHospitalFavoriteCount
);

// Get list of latest favorites
router.get(
  "/latest",
  cacheMiddleware(60),
  FavoriteController.getLatestFavorites
);

module.exports = router;
