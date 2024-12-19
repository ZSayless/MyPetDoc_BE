const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");

// Định nghĩa các routes
router.use("/auth", authRoutes);

// Có thể thêm các routes khác ở đây
// router.use('/users', userRoutes);
// router.use('/hospitals', hospitalRoutes);
// router.use('/reviews', reviewRoutes);
// ...

module.exports = router;
