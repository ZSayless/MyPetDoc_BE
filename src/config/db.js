const mysql = require("mysql2/promise");
require("dotenv").config({ path: ".env" });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Kiểm tra kết nối
pool
  .getConnection()
  .then((connection) => {
    console.log("Connected to MySQL database!");
    connection.release();
  })
  .catch((err) => {
    console.error("Error connecting to MySQL:", err.message);
    console.log("Database name:", process.env.DB_NAME);
    console.log("Database host:", process.env.DB_HOST);
    console.log("Database port:", process.env.DB_PORT);
    console.log("Database user:", process.env.DB_USER);
  });

module.exports = pool;
