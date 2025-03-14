const express = require("express");
const HospitalController = require("../controllers/HospitalController");
const { validateAuth } = require("../middleware/validateAuth");
const {
  validateHospital,
  validateHospitalOwnership,
} = require("../middleware/validateHospital");
const cacheMiddleware = require("../middleware/cacheMiddleware");
const {
  handleUploadHospitalImages,
} = require("../middleware/uploadMiddleware");

const router = express.Router();

// Public routes (no need to login)
router.get("/", cacheMiddleware(3600), HospitalController.getHospitals);
router.get(
  "/search",
  cacheMiddleware(1800),
  HospitalController.searchHospitals
);
router.get("/:id", cacheMiddleware(3600), HospitalController.getHospitalById);
router.get(
  "/:hospitalId/images",
  cacheMiddleware(1800),
  HospitalController.getImages
);

router.get(
  "/by-slug/:slug",
  cacheMiddleware(1800),
  HospitalController.getHospitalBySlug
);

// Like/unlike image routes
router.post("/:hospitalId/images/:imageId/like", validateAuth(), HospitalController.toggleImageLike);
router.get("/:hospitalId/images/:imageId/like/check", validateAuth(), HospitalController.checkImageLike);

// Routes require admin or hospital admin permission
router.use(validateAuth(["ADMIN", "HOSPITAL_ADMIN"]));

// Routes for HOSPITAL_ADMIN (only manage own hospital)
router.put(
  "/:id",
  validateAuth(["HOSPITAL_ADMIN", "ADMIN"]),
  handleUploadHospitalImages,
  validateHospitalOwnership,
  validateHospital,
  HospitalController.updateHospital
);

router.post(
  "/:hospitalId/images",
  validateAuth(["HOSPITAL_ADMIN", "ADMIN"]),
  handleUploadHospitalImages,
  HospitalController.addImages
);

router.delete(
  "/:hospitalId/images/:imageId",
  validateAuth(["HOSPITAL_ADMIN", "ADMIN"]),
  HospitalController.deleteImage
);

router.post(
  "/create",
  handleUploadHospitalImages,
  HospitalController.createHospital
);

router.delete("/:id", validateAuth(["ADMIN"]), HospitalController.hardDelete);

router.patch(
  "/:id/toggle-delete",
  validateAuth(["ADMIN"]),
  HospitalController.toggleDelete
);

// Route toggle proposal
router.patch(
  "/:id/toggle-proposal",
  validateAuth(["ADMIN"]),
  HospitalController.toggleProposal
);

// Routes require login (all roles)
router.use(validateAuth(["GENERAL_USER", "HOSPITAL_ADMIN", "ADMIN"]));


// Route toggle active
router.patch(
  "/:id/toggle-active",
  validateAuth(["ADMIN", "HOSPITAL_ADMIN"]),
  validateHospitalOwnership,
  HospitalController.toggleActive
);

router.get("/deleted/list", validateAuth(["ADMIN"]), HospitalController.getDeletedHospitals);

// Get hospitals by creator
router.get(
  "/creator/:creatorId",
  validateAuth(["ADMIN", "HOSPITAL_ADMIN"]),
  cacheMiddleware(1800),
  HospitalController.getHospitalsByCreator
);

module.exports = router;
