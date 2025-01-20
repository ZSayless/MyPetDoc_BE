const express = require("express");
const { errorConverter, errorHandler } = require("./middleware/errorConverter");
const ApiError = require("./exceptions/ApiError");
const routes = require("./routes");
const cors = require("cors");
const morgan = require("morgan");
const passport = require("./config/passport");
const securityMiddleware = require("./middleware/security");
const timeout = require("./middleware/timeout");
const { sanitizer } = require("./middleware/sanitizer");
const logger = require("./utils/logger");
const session = require('express-session');

const app = express();

// Basic middleware
app.use(morgan("combined")); // Log requests
app.use(cors());

// Security middleware
securityMiddleware(app);

// Sanitizer middleware
app.use(sanitizer());

// Tăng giới hạn kích thước request
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Thêm session middleware trước passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Request timeout
app.use(timeout(30000));

// Request logger
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
  });
}

// API routes
app.use("/api", routes);

// Handle 404 error
app.use((req, res, next) => {
  next(new ApiError(404, "Not found"));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle error
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  app.close(() => {
    logger.info("HTTP server closed");
  });
});

module.exports = app;
