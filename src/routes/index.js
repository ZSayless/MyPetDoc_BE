const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const hospitalRoutes = require("./hospitalRoutes");
const contactMessageRoutes = require("./contactMessageRoutes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/hospitals", hospitalRoutes);
router.use("/contact-messages", contactMessageRoutes);

module.exports = router;
