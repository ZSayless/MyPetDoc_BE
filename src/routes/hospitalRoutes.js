const express = require("express");
const HospitalController = require("../controllers/HospitalController");
const { validateAuth } = require("../middleware/validateAuth");

const router = express.Router();

// Route lấy danh sách và tìm kiếm
router.get("/", HospitalController.getHospitals);
router.get("/search", HospitalController.searchHospitals);

// Route lấy chi tiết
router.get("/:id", HospitalController.getHospitalById);

// Middleware xác thực cho tất cả các routes còn lại
router.use(validateAuth(["HOSPITAL_ADMIN"]));

// Route tạo mới
router.post("/create", HospitalController.createHospital);

// Route cập nhật
router.put("/:id", HospitalController.updateHospital);

// Route xóa
router.delete("/:id", HospitalController.hardDelete);
router.patch("/:id/toggle-delete", HospitalController.toggleDelete);

module.exports = router;
