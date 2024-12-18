const mysql = require("mysql2/promise");
require("dotenv").config({ path: ".env" });
const config = require("../config/db");
const createDatabase = require("./create_database");
const createUsers = require("./create_users");
const createHospitals = require("./create_hospitals");
const createFavorites = require("./create_favorites");
const createReportReasons = require("./create_report_reasons");
const createFaqs = require("./create_faqs");
const createReviews = require("./create_reviews");
const createContactInformation = require("./create_contact_information");
const createContactMessages = require("./create_contact_messages");
const createBanners = require("./create_banners");
const createCtaContents = require("./create_cta_contents");
const createPhotos = require("./create_photos");

const runMigrations = async () => {
  let connection;
  try {
    console.log("Environment variables:", {
      DB_HOST: process.env.DB_HOST,
      DB_USER: process.env.DB_USER,
      DB_NAME: process.env.DB_NAME,
      DB_PORT: process.env.DB_PORT,
      DB_PASS: process.env.DB_PASS,
    });

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: process.env.DB_PORT,
    });

    console.log("Connected to MySQL successfully");
    console.log("Running migrations...");
    await createDatabase(connection);
    await connection.query(`USE ${process.env.DB_NAME}`);

    console.log("Creating tables...");
    await createUsers(connection);
    await createHospitals(connection);
    await createReviews(connection);
    await createReportReasons(connection);
    await createFavorites(connection);
    await createBanners(connection);
    await createPhotos(connection);
    await createContactMessages(connection);
    await createContactInformation(connection);
    await createFaqs(connection);
    await createCtaContents(connection);

    console.log("Migrations completed successfully.");
    await connection.end();
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  }
};

runMigrations().catch((error) => console.error(error));
