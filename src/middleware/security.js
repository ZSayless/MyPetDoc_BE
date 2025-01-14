const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const xss = require("xss");
const hpp = require("hpp");

const securityMiddleware = (app) => {
  // 1. Helmet - Protect HTTP headers
  app.use(helmet());

  // 2. CORS - Configure details
  const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    credentials: true,
    maxAge: 3600,
  };
  app.use(cors(corsOptions));

  // 3. Rate limiting - Limit request
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP
    message:
      "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", limiter);

  // 4. XSS Protection - Sử dụng xss package thay vì xss-clean
  app.use((req, res, next) => {
    if (req.body) {
      // Sanitize request body
      Object.keys(req.body).forEach((key) => {
        if (typeof req.body[key] === "string") {
          req.body[key] = xss(req.body[key]);
        }
      });
    }

    if (req.query) {
      // Sanitize query parameters
      Object.keys(req.query).forEach((key) => {
        if (typeof req.query[key] === "string") {
          req.query[key] = xss(req.query[key]);
        }
      });
    }

    next();
  });

  // 5. Prevent HTTP Parameter Pollution
  app.use(hpp());

  // 6. Security Headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
    next();
  });
};

module.exports = securityMiddleware;
