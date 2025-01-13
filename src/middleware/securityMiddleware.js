const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");
const xss = require("xss");
const express = require("express");

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP
  message: {
    status: "error",
    message: "Too many requests, please try again later",
  },
});

// Speed limiting
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: () => 500,
  validate: {
    delayMs: false,
  },
});

// XSS Middleware
const xssMiddleware = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === "string") {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  next();
};

// Apply middleware
const applySecurityMiddleware = (app) => {
  // Protect headers
  app.use(helmet());

  // Limit request size
  app.use(express.json({ limit: "50kb" }));

  // Prevent XSS
  app.use(xssMiddleware);

  // Rate limiting for API
  app.use("/api/", limiter);
  app.use("/api/", speedLimiter);
};

module.exports = applySecurityMiddleware;
