const mysql = require("mysql2/promise");
require("dotenv").config({ path: ".env" });
const config = require("../config/db");
const createDatabase = require("./create_database");
const createUsers = require("./create_users");
const createHospitals = require("./create_hospitals");
const createFavorites = require("./create_favorites");
const createReportReasons = require("./create_report_reasons");
const createFaqs = require("./create_faqs");
const createAboutUs = require("./create_about_us");
const createBlogPosts = require("./create_blog_posts");
const createPrivacyPolicy = require("./create_privacy_policy");
const createTermsAndConditions = require("./create_terms_conditions");
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
    // 1. Tạo bảng users và fields liên quan trước
    await createUsers(connection);
    // 2. Tạo các bảng có khóa ngoại tham chiếu đến users
    await createHospitals(connection);
    await createBanners(connection);
    await createAboutUs(connection);
    await createPrivacyPolicy(connection);
    await createTermsAndConditions(connection);
    await createBlogPosts(connection);
    // 3. Tạo các bảng có khóa ngoại tham chiếu đến hospitals hoặc users
    await createReviews(connection);
    await createReportReasons(connection);
    await createFavorites(connection);
    await createPhotos(connection);
    await createContactMessages(connection);
    // 4. Tạo các bảng độc lập không có khóa ngoại
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
