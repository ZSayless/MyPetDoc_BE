const express = require("express");
const { errorConverter, errorHandler } = require("./middleware/errorConverter");
const ApiError = require("./exceptions/ApiError");
const routes = require("./routes");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

// Middleware
app.use(morgan("combined"));
app.use(cors());

// Parse json request body
app.use(express.json());

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// API routes - đặt routes TRƯỚC middleware xử lý lỗi 404
app.use("/api", routes);

// handle 404 error - đặt SAU routes
app.use((req, res, next) => {
  next(new ApiError(404, "Not found"));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;
