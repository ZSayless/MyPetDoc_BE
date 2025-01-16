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
router.get("/:hospitalId/images", HospitalController.getImages);
router.get("/slug/:slug", HospitalController.getHospitalBySlug);

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

module.exports = router;
