const express = require("express");
const router = express.Router();
const FAQController = require("../controllers/FAQController");
const { validateAuth } = require("../middleware/validateAuth");

// Routes công khai
router.get("/", FAQController.getFAQs);
router.get("/search", FAQController.searchFAQs);
router.get("/:id", FAQController.getFAQById);

// Routes yêu cầu xác thực ADMIN
router.use(validateAuth(["ADMIN"]));
router.post("/", FAQController.createFAQ);
router.put("/:id", FAQController.updateFAQ);
router.patch("/:id/toggle-delete", FAQController.toggleSoftDelete);
router.delete("/:id", FAQController.hardDelete);

module.exports = router;
