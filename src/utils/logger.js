const winston = require("winston");
const path = require("path");
const DailyRotateFile = require("winston-daily-rotate-file");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Error logs
    new DailyRotateFile({
      filename: path.join(__dirname, "../logs/error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: "14d",
    }),
    // Security logs
    new DailyRotateFile({
      filename: path.join(__dirname, "../logs/security-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "warn",
      maxSize: "20m",
      maxFiles: "30d",
    }),
    // Combined logs
    new DailyRotateFile({
      filename: path.join(__dirname, "../logs/combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

module.exports = logger;
