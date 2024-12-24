const express = require("express");
const { errorConverter, errorHandler } = require("./middleware/errorConverter");
const ApiError = require("./exceptions/ApiError");
const routes = require("./routes");
const cors = require("cors");
const morgan = require("morgan");
const passport = require("./config/passport");

const app = express();

// Middleware
app.use(morgan("combined"));
app.use(cors());

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

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
