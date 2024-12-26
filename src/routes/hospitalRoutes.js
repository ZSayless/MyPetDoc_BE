const express = require("express");
const HospitalController = require("../controllers/HospitalController");
const { validateAuth } = require("../middleware/validateAuth");
const {
  handleUploadHospitalImages,
} = require("../middleware/uploadMiddleware");

const router = express.Router();

// Routes công khai - không cần đăng nhập
router.get("/", HospitalController.getHospitals);
router.get("/search", HospitalController.searchHospitals);
router.get("/:id", HospitalController.getHospitalById);
router.get("/:hospitalId/images", HospitalController.getImages);

// Routes yêu cầu ADMIN hoặc HOSPITAL_ADMIN
router.use(validateAuth(["ADMIN", "HOSPITAL_ADMIN"]));

// Routes cho HOSPITAL_ADMIN (chỉ quản lý bệnh viện của mình)
router.put(
  "/:id",
  validateAuth(["HOSPITAL_ADMIN", "ADMIN"]),
  handleUploadHospitalImages,
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
