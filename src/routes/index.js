const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const hospitalRoutes = require("./hospitalRoutes");
const contactMessageRoutes = require("./contactMessageRoutes");
const aboutUsRoutes = require("./aboutUsRoutes");
const termsConditionsRoutes = require("./termsConditionsRoutes");
const contactInformationRoutes = require("./contactInformationRoutes");
const reviewRoutes = require("./reviewRoutes");
const bannerRoutes = require("./bannerRoutes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/hospitals", hospitalRoutes);
router.use("/contact-messages", contactMessageRoutes);
router.use("/reviews", reviewRoutes);
router.use("/about-us", aboutUsRoutes);
router.use("/terms", termsConditionsRoutes);
router.use("/contact-info", contactInformationRoutes);
router.use("/banners", bannerRoutes);

module.exports = router;
