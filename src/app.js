const express = require("express");
const { errorConverter, errorHandler } = require("./middleware/errorConverter");
const ApiError = require("./exceptions/ApiError");
const routes = require("./routes");
const cors = require("cors");
const morgan = require("morgan");
const passport = require("./config/passport");
const path = require("path");

const app = express();

// Middleware
app.use(morgan("combined"));
app.use(cors());

// Tăng giới hạn kích thước request
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files from uploads directory
// app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Passport middleware
app.use(passport.initialize());

// API routes
app.use("/api", routes);

// handle 404 error
app.use((req, res, next) => {
  next(new ApiError(404, "Not found"));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;
