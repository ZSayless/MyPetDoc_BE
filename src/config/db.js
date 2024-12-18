const mysql = require("mysql2");
require("dotenv").config({ path: ".env" });

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err.message);
    console.log("Database name:", process.env.DB_NAME);
    console.log("Database host:", process.env.DB_HOST);
    console.log("Database port:", process.env.DB_PORT);
    console.log("Database user:", process.env.DB_USER);
    return;
  }
  console.log("Connected to MySQL database!");
});

module.exports = connection;
