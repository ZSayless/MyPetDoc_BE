require("dotenv").config();
const app = require("./app");
const logger = require("./utils/logger");
const cache = require("./config/redis");
const db = require("./config/db");

const PORT = process.env.PORT || 3000;

// Connect to database
const conn = db;

// Start server
const server = app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);

  // Check cache status
  const cacheStatus = cache.getStatus();
  logger.info(
    `Cache system: ${cacheStatus.type}, Connected: ${cacheStatus.connected}`
  );
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
    logger.error("UNHANDLED REJECTION! 💥 Shutting down...");
  logger.error(err);

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  logger.error(err);
  process.exit(1);
});

module.exports = { app, server };
