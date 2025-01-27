const express = require("express");
const router = express.Router();
const FAQController = require("../controllers/FAQController");
const { validateAuth } = require("../middleware/validateAuth");
const cacheMiddleware = require("../middleware/cacheMiddleware");

// Public routes
router.get("/", cacheMiddleware(3600), FAQController.getFAQs);
router.get("/search", cacheMiddleware(1800), FAQController.searchFAQs);
router.get("/:id", cacheMiddleware(1800), FAQController.getFAQById);

// Routes require admin authentication
router.use(validateAuth(["ADMIN"]));
router.post("/", FAQController.createFAQ);
router.put("/:id", FAQController.updateFAQ);
router.patch("/:id/toggle-delete", FAQController.toggleSoftDelete);
router.delete("/:id", FAQController.hardDelete);

module.exports = router;
