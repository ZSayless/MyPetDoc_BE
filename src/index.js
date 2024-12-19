const app = require("./app");
require("dotenv").config();

const port = process.env.PORT || 3000;

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
