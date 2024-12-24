const express = require("express");
const ContactInformationController = require("../controllers/ContactInformationController");
const { validateAuth } = require("../middleware/validateAuth");

const router = express.Router();

// Routes công khai - không cần đăng nhập
router.get("/current", ContactInformationController.getCurrentContact);

// Routes yêu cầu quyền admin
router.use(validateAuth(["HOSPITAL_ADMIN"]));
router.get("/version/:version", ContactInformationController.getVersion);
router.get("/history", ContactInformationController.getVersionHistory);
router.get("/compare", ContactInformationController.compareVersions);
router.post("/create", ContactInformationController.createNewVersion);
router.patch("/soft-delete/:id", ContactInformationController.toggleSoftDelete);
router.delete("/hard-delete/:id", ContactInformationController.hardDelete);

module.exports = router;
