const app = require("./app");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const port = process.env.PORT || 3000;

// Tạo thư mục uploads nếu chưa tồn tại
const uploadsDir = path.join(__dirname, "../uploads");
const reviewsDir = path.join(uploadsDir, "reviews");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(reviewsDir)) {
  fs.mkdirSync(reviewsDir);
}

// Kết nối database
const db = require("./config/db");
const conn = db.connection;

// Khởi động server
app.listen(port, () => {
  console.log(`Server đang chạy trên port ${port}`);
});

// Xử lý lỗi không được xử lý (Unhandled Promise Rejection)
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

// Xử lý lỗi không mong muốn
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});
