const mysql = require("mysql2/promise");
require("dotenv").config({ path: ".env" });
const config = require("../config/db");
const createDatabase = require("./create_database");
const createUsers = require("./create_users");
const createHospitals = require("./create_hospitals");
const createFavorites = require("./create_favorites");
const createReportReasons = require("./create_report_reasons");
const createFaqs = require("./create_faqs");
const createHospitalImageLikes = require("./create_hospital_image_likes");
const createAboutUs = require("./create_about_us");
const createPetPosts = require("./create_pet_posts");
const createPetGallery = require("./create_pet_gallery");
const createPetGalleryComments = require("./create_pet_gallery_comments");
const createPetGalleryLikes = require("./create_pet_gallery_likes");
const createPrivacyPolicy = require("./create_privacy_policy");
const createHospitalImages = require("./create_hospital_images");
const createTermsAndConditions = require("./create_terms_conditions");
const createReviews = require("./create_reviews");
const createContactInformation = require("./create_contact_information");
const createContactMessages = require("./create_contact_messages");
const createBanners = require("./create_banners");
const createCtaContents = require("./create_cta_contents");
const addForeignKeys = require("./add_foreign_keys");

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
    // 1. Create basic tables (without foreign keys)
    await createHospitals(connection);
    await createUsers(connection);

    // 2. Add foreign keys after
    await addForeignKeys(connection);

    // 3. Create dependent tables
    await createHospitalImages(connection);
    await createBanners(connection);
    await createAboutUs(connection);
    await createPetPosts(connection);
    await createPetGallery(connection);
    await createPetGalleryComments(connection);
    await createPetGalleryLikes(connection);
    await createHospitalImageLikes(connection);
    await createPrivacyPolicy(connection);
    await createTermsAndConditions(connection);
    await createReviews(connection);
    await createReportReasons(connection);
    await createFavorites(connection);
    await createContactMessages(connection);
    await createContactInformation(connection);
    await createFaqs(connection);
    // await createCtaContents(connection);

    console.log("Migrations completed successfully.");
    await connection.end();
  } catch (error) {
    console.error("Error running migrations:", error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
};

runMigrations().catch((error) => console.error(error));
