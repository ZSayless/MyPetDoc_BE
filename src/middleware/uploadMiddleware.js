const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ApiError = require("../exceptions/ApiError");

// Tạo thư mục upload cho reviews
const uploadReviewDir = path.join(__dirname, "../../uploads/reviews");
if (!fs.existsSync(uploadReviewDir)) {
  fs.mkdirSync(uploadReviewDir, { recursive: true });
}

// Tạo thư mục upload cho banners
const uploadBannerDir = path.join(__dirname, "../../uploads/banners");
if (!fs.existsSync(uploadBannerDir)) {
  fs.mkdirSync(uploadBannerDir, { recursive: true });
}

// Tạo thư mục upload cho pet posts
const uploadPetPostDir = path.join(__dirname, "../../uploads/petposts");
if (!fs.existsSync(uploadPetPostDir)) {
  fs.mkdirSync(uploadPetPostDir, { recursive: true });
}

// Tạo thư mục upload cho hospitals
const uploadHospitalDir = path.join(__dirname, "../../uploads/hospitals");
if (!fs.existsSync(uploadHospitalDir)) {
  fs.mkdirSync(uploadHospitalDir, { recursive: true });
}

// Tạo thư mục upload cho pet gallery
const uploadPetGalleryDir = path.join(__dirname, "../../uploads/petgallery");
if (!fs.existsSync(uploadPetGalleryDir)) {
  fs.mkdirSync(uploadPetGalleryDir, { recursive: true });
}

// Storage cho banner images
const bannerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadBannerDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `banner-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Storage cho review images
const reviewStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadReviewDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `review-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Storage cho pet post images
const petPostStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPetPostDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `pet-post-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Storage cho hospital images
const hospitalStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("Saving file to:", uploadHospitalDir);
    cb(null, uploadHospitalDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `hospital-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    console.log("Generated filename:", uniqueName);
    cb(null, uniqueName);
  },
});

// Thêm storage cho pet gallery images
const petGalleryStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPetGalleryDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `pet-gallery-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Middleware xử lý upload hình ảnh review
const handleUploadReviewImages = (req, res, next) => {
  const upload = multer({
    storage: reviewStorage, // Sửa từ storage thành reviewStorage
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!file) {
        cb(null, true);
        return;
      }
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new ApiError(400, "Chỉ chấp nhận file ảnh (jpg, png, gif)"));
      }
    },
  }).single("image", 1);

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(new ApiError(400, "Chỉ được phép upload 1 ảnh cho banner"));
      }
      return next(new ApiError(400, `Lỗi upload: ${err.message}`));
    }
    if (err) {
      return next(new ApiError(400, err.message));
    }
    next();
  });
};

// Middleware xử lý upload hình ảnh pet post
const handleUploadPetPostImages = (req, res, next) => {
  const upload = multer({
    storage: petPostStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!file) {
        cb(null, true);
        return;
      }
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new ApiError(400, "Chỉ chấp nhận file ảnh (jpg, png, gif)"));
      }
    },
  }).fields([
    { name: "featured_image", maxCount: 1 },
    { name: "thumbnail_image", maxCount: 1 },
  ]); // Sửa từ .array() thành .fields()

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return next(new ApiError(400, `Lỗi upload: ${err.message}`));
    }
    if (err) {
      return next(new ApiError(400, err.message));
    }

    // Xử lý và gán đường dẫn file vào req.body
    if (req.files) {
      if (req.files.featured_image) {
        req.body.featured_image = `/uploads/petposts/${req.files.featured_image[0].filename}`;
      }
      if (req.files.thumbnail_image) {
        req.body.thumbnail_image = `/uploads/petposts/${req.files.thumbnail_image[0].filename}`;
      }
    }

    next();
  });
};

// Middleware xử lý upload hình ảnh banner
const handleUploadBannerImages = (req, res, next) => {
  const upload = multer({
    storage: bannerStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!file) {
        cb(null, true);
        return;
      }
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new ApiError(400, "Chỉ chấp nhận file ảnh (jpg, png, gif)"));
      }
    },
  }).single("image", 1);
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(new ApiError(400, "Chỉ được phép upload 1 ảnh cho banner"));
      }
      return next(new ApiError(400, `Lỗi upload: ${err.message}`));
    }
    if (err) {
      return next(new ApiError(400, err.message));
    }
    next();
  });
};

// Middleware xử lý upload hình ảnh bệnh viện
const handleUploadHospitalImages = (req, res, next) => {
  console.log("Starting hospital image upload...");

  const upload = multer({
    storage: hospitalStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new ApiError(400, "Chỉ chấp nhận file ảnh (jpg, png, gif)"));
      }
    },
  }).array("images", 5); // Cho phép tối đa 5 ảnh, field name là "images"

  upload(req, res, function (err) {
    console.log("Upload completed");
    console.log("Files:", req.files);

    if (err instanceof multer.MulterError) {
      return next(new ApiError(400, `Lỗi upload: ${err.message}`));
    }
    if (err) {
      return next(new ApiError(400, err.message));
    }
    next();
  });
};

// Thêm middleware xử lý upload hình ảnh pet gallery
const handleUploadPetGalleryImages = (req, res, next) => {
  const upload = multer({
    storage: petGalleryStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!file) {
        cb(null, true);
        return;
      }
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new ApiError(400, "Chỉ chấp nhận file ảnh (jpg, png, gif)"));
      }
    },
  }).array("images", 10); // Cho phép upload tối đa 10 ảnh

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(new ApiError(400, "Chỉ được phép upload tối đa 10 ảnh"));
      }
      return next(new ApiError(400, `Lỗi upload: ${err.message}`));
    }
    if (err) {
      return next(new ApiError(400, err.message));
    }
    next();
  });
};

module.exports = {
  handleUploadReviewImages,
  handleUploadHospitalImages,
  handleUploadBannerImages,
  handleUploadPetGalleryImages,
  handleUploadPetPostImages,
};
