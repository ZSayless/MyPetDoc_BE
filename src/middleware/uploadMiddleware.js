const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ApiError = require("../exceptions/ApiError");

// Tạo thư mục upload
const uploadDir = path.join(__dirname, "../../uploads/reviews");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Basic storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `review-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Middleware xử lý upload
const handleUpload = (req, res, next) => {
  // Nếu không có file, bỏ qua xử lý upload
  if (!req.files && !req.file) {
    return next();
  }

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!file) {
        cb(null, true);
        return;
      }
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Chỉ chấp nhận file ảnh (jpg, png, gif)"));
      }
    },
  }).single("image_url");

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return next(new ApiError(400, err.message));
    }
    if (err) {
      return next(new ApiError(400, err.message));
    }
    next();
  });
};

module.exports = handleUpload;
