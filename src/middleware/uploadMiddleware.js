const multer = require("multer");
const ApiError = require("../exceptions/ApiError");
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Create upload directory for reviews
// const uploadReviewDir = path.join(__dirname, "../../uploads/reviews");
// if (!fs.existsSync(uploadReviewDir)) {
//   fs.mkdirSync(uploadReviewDir, { recursive: true });
// }

// Create upload directory for avatars
// const uploadAvatarDir = path.join(__dirname, "../../uploads/avatars");
// if (!fs.existsSync(uploadAvatarDir)) {
//   fs.mkdirSync(uploadAvatarDir, { recursive: true });
// }

// Create upload directory for banners
// const uploadBannerDir = path.join(__dirname, "../../uploads/banners");
// if (!fs.existsSync(uploadBannerDir)) {
//   fs.mkdirSync(uploadBannerDir, { recursive: true });
// }

// Create upload directory for pet posts
// const uploadPetPostDir = path.join(__dirname, "../../uploads/petposts");
// if (!fs.existsSync(uploadPetPostDir)) {
//   fs.mkdirSync(uploadPetPostDir, { recursive: true });
// }

// Create upload directory for hospitals
// const uploadHospitalDir = path.join(__dirname, "../../uploads/hospitals");
// if (!fs.existsSync(uploadHospitalDir)) {
//   fs.mkdirSync(uploadHospitalDir, { recursive: true });
// }

// Create upload directory for pet gallery
// const uploadPetGalleryDir = path.join(__dirname, "../../uploads/petgallery");
// if (!fs.existsSync(uploadPetGalleryDir)) {
//   fs.mkdirSync(uploadPetGalleryDir, { recursive: true });
// }
////////////////////////////////////////////////////////////

// Storage for banner images
// const bannerStorage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadBannerDir);
//   },
//   filename: function (req, file, cb) {
//     const uniqueName = `banner-${Date.now()}-${Math.round(
//       Math.random() * 1e9
//     )}${path.extname(file.originalname)}`;
//     cb(null, uniqueName);
//   },
// });

const bannerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "banners",
    allowed_formats: ["jpg", "png", "jpeg", "gif"],
    transformation: [{ width: 1200, height: 400, crop: "fill" }],
  },
});
////////////////////////////////////////////////

// Storage for avatar
// const avatarStorage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadAvatarDir);
//   },
//   filename: function (req, file, cb) {
//     const uniqueName = `avatar-${Date.now()}-${Math.round(
//       Math.random() * 1e9
//     )}${path.extname(file.originalname)}`;
//     cb(null, uniqueName);
//   },
// });
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "avatars",
    allowed_formats: ["jpg", "png", "jpeg", "gif"],
    transformation: [{ width: 400, height: 400, crop: "fill" }],
  },
});
////////////////////////////////////////////////////////////

// Storage for review images
// const reviewStorage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadReviewDir);
//   },
//   filename: function (req, file, cb) {
//     const uniqueName = `review-${Date.now()}-${Math.round(
//       Math.random() * 1e9
//     )}${path.extname(file.originalname)}`;
//     cb(null, uniqueName);
//   },
// });
const reviewStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "reviews",
    allowed_formats: ["jpg", "png", "jpeg", "gif"],
    transformation: [{ width: 800, height: 600, crop: "fill" }],
  },
});
////////////////////////////////////////////////////////////

// Storage for pet post images
// const petPostStorage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadPetPostDir);
//   },
//   filename: function (req, file, cb) {
//     const uniqueName = `pet-post-${Date.now()}-${Math.round(
//       Math.random() * 1e9
//     )}${path.extname(file.originalname)}`;
//     cb(null, uniqueName);
//   },
// });
const petPostStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "petposts",
    allowed_formats: ["jpg", "png", "jpeg", "gif"],
    transformation: [{ width: 1200, height: 800, crop: "fill" }],
  },
});

// Storage for hospital images
// const hospitalStorage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     console.log("Saving file to:", uploadHospitalDir);
//     cb(null, uploadHospitalDir);
//   },
//   filename: function (req, file, cb) {
//     const uniqueName = `hospital-${Date.now()}-${Math.round(
//       Math.random() * 1e9
//     )}${path.extname(file.originalname)}`;
//     console.log("Generated filename:", uniqueName);
//     cb(null, uniqueName);
//   },
// });
const hospitalStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "hospitals",
    allowed_formats: ["jpg", "png", "jpeg", "gif"],
    transformation: [{ width: 800, height: 600, crop: "fill" }],
  },
});
////////////////////////////////////////////////////////////

// Add storage for pet gallery images
// const petGalleryStorage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadPetGalleryDir);
//   },
//   filename: function (req, file, cb) {
//     const uniqueName = `pet-gallery-${Date.now()}-${Math.round(
//       Math.random() * 1e9
//     )}${path.extname(file.originalname)}`;
//     cb(null, uniqueName);
//   },
// });

const petGalleryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "petgallerys",
    allowed_formats: ["jpg", "png", "jpeg", "gif"],
    transformation: [{ width: 800, height: 600, crop: "fill" }],
  },
});
////////////////////////////////////////////////////////////
// Middleware for uploading review images
// const handleUploadReviewImages = (req, res, next) => {
//   const upload = multer({
//     storage: reviewStorage, // Sửa từ storage thành reviewStorage
//     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
//     fileFilter: (req, file, cb) => {
//       const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
//       if (!file) {
//         cb(null, true);
//         return;
//       }
//       if (allowedTypes.includes(file.mimetype)) {
//         cb(null, true);
//       } else {
//         cb(new ApiError(400, "Chỉ chấp nhận file ảnh (jpg, png, gif)"));
//       }
//     },
//   }).single("image", 1);

//   upload(req, res, (err) => {
//     if (err instanceof multer.MulterError) {
//       if (err.code === "LIMIT_UNEXPECTED_FILE") {
//         return next(new ApiError(400, "Chỉ được phép upload 1 ảnh cho banner"));
//       }
//       return next(new ApiError(400, `Lỗi upload: ${err.message}`));
//     }
//     if (err) {
//       return next(new ApiError(400, err.message));
//     }
//     next();
//   });
// };
const handleUploadReviewImages = (req, res, next) => {
  const upload = multer({
    storage: reviewStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!file) {
        cb(null, true);
        return;
      }
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new ApiError(400, "Only accept image files (jpg, png, gif)"));
      }
    },
  }).single("image");

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return next(new ApiError(400, `Upload error: ${err.message}`));
    }
    if (err) {
      return next(new ApiError(400, err.message));
    }
    next();
  });
};
////////////////////////////////////////////////////////////
// Middleware for uploading avatar
// const handleUploadAvatar = (req, res, next) => {
//   const upload = multer({
//     storage: avatarStorage,
//     limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
//     fileFilter: (req, file, cb) => {
//       const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
//       if (!file) {
//         cb(null, true);
//         return;
//       }
//       if (allowedTypes.includes(file.mimetype)) {
//         cb(null, true);
//       } else {
//         cb(new ApiError(400, "Only accept image files (jpg, png, gif)"));
//       }
//     },
//   }).fields([
//     { name: "avatar", maxCount: 1 },
//     { name: "email", maxCount: 1 },
//     { name: "password", maxCount: 1 },
//     { name: "full_name", maxCount: 1 },
//     { name: "role", maxCount: 1 },
//   ]);

//   upload(req, res, (err) => {
//     if (err instanceof multer.MulterError) {
//       return next(new ApiError(400, `Upload error: ${err.message}`));
//     }
//     if (err) {
//       return next(new ApiError(400, err.message));
//     }

//     // Convert fields to body
//     req.body = {
//       ...req.body,
//       email: req.body.email,
//       password: req.body.password,
//       full_name: req.body.full_name,
//       role: req.body.role || "GENERAL_USER",
//     };

//     next();
//   });
// };
const petPhotoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "pets",
    allowed_formats: ["jpg", "png", "jpeg", "gif"],
    transformation: [{ width: 800, height: 600, crop: "fill" }],
  },
});

const handleUploadAvatar = (req, res, next) => {
  const uploadFields = multer({
    storage: multer.diskStorage({}),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!file) {
        cb(null, true);
        return;
      }
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new ApiError(400, "Only accept image files (jpg, png, gif)"));
      }
    },
  }).fields([
    { name: "avatar", maxCount: 1 },
    { name: "pet_photo", maxCount: 1 },
  ]);

  uploadFields(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new ApiError(400, "File size cannot exceed 10MB"));
      }
      return next(new ApiError(400, `Upload error: ${err.message}`));
    }

    if (err) {
      return next(new ApiError(400, err.message));
    }

    try {
      // Upload to Cloudinary and get URLs
      if (req.files) {
        req.uploadedFiles = {};

        // Tạo mảng promises để xử lý upload đồng thời
        const uploadPromises = [];

        if (req.files.avatar && req.files.avatar[0]) {
          uploadPromises.push(
            cloudinary.uploader.upload(req.files.avatar[0].path, {
              folder: "avatars",
              transformation: [{ width: 400, height: 400, crop: "fill" }],
            })
          );
        }

        if (req.files.pet_photo && req.files.pet_photo[0]) {
          uploadPromises.push(
            cloudinary.uploader.upload(req.files.pet_photo[0].path, {
              folder: "pets",
              transformation: [{ width: 800, height: 600, crop: "fill" }],
            })
          );
        }

        // Xử lý tất cả uploads cùng lúc
        const results = await Promise.all(uploadPromises);

        // Gán kết quả vào req.uploadedFiles
        if (req.files.avatar) {
          req.uploadedFiles.avatar = {
            path: results[0].secure_url,
            publicId: results[0].public_id,
          };
        }
        
        if (req.files.pet_photo) {
          const resultIndex = req.files.avatar ? 1 : 0;
          req.uploadedFiles.pet_photo = {
            path: results[resultIndex].secure_url,
            publicId: results[resultIndex].public_id,
          };
        }
      }

      next();
    } catch (error) {
      // Xóa tất cả files đã upload nếu có lỗi
      if (req.uploadedFiles) {
        const deletePromises = [];
        
        if (req.uploadedFiles.avatar) {
          deletePromises.push(
            cloudinary.uploader.destroy(req.uploadedFiles.avatar.publicId)
          );
        }
        
        if (req.uploadedFiles.pet_photo) {
          deletePromises.push(
            cloudinary.uploader.destroy(req.uploadedFiles.pet_photo.publicId)
          );
        }

        try {
          await Promise.all(deletePromises);
        } catch (deleteError) {
          console.error("Error deleting uploaded files:", deleteError);
        }
      }
      return next(error);
    }
  });
};
////////////////////////////////////////////////////////////
// Middleware for uploading pet post images
const handleUploadPetPostImages = (req, res, next) => {
  const upload = multer({
    storage: petPostStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!allowedTypes.includes(file.mimetype)) {
        return cb(new ApiError(400, "Only accept image files (jpg, png, gif)"));
      }
      cb(null, true);
    },
  }).fields([
    { name: "featured_image", maxCount: 1 },
    { name: "thumbnail_image", maxCount: 1 },
  ]);

  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new ApiError(400, "Image file size exceeds 10MB"));
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(new ApiError(400, "Only upload up to 2 images"));
      }
      return next(new ApiError(400, `Upload error: ${err.message}`));
    }

    if (err) {
      return next(new ApiError(400, err.message));
    }

    // Handle cleanup if there's a validation error
    const cleanup = async () => {
      if (req.files) {
        for (const fieldname in req.files) {
          for (const file of req.files[fieldname]) {
            if (file.path) {
              try {
                const publicId = file.path.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(`petposts/${publicId}`);
              } catch (error) {
                console.error(`Error deleting image ${file.path}:`, error);
              }
            }
          }
        }
      }
    };

    // Validate required images for create post
    if (req.method === "POST") {
      if (
        !req.files ||
        !req.files.featured_image ||
        !req.files.thumbnail_image
      ) {
        await cleanup();
        return next(
          new ApiError(400, "Need to upload both featured and thumbnail images")
        );
      }
    }

    // Convert files to the format suitable for the service
    if (req.files) {
      if (req.files.featured_image) {
        req.body.featured_image = req.files.featured_image[0];
      }
      if (req.files.thumbnail_image) {
        req.body.thumbnail_image = req.files.thumbnail_image[0];
      }
    }

    next();
  });
};

// Middleware for uploading banner images
// const handleUploadBannerImages = (req, res, next) => {
//   const upload = multer({
//     storage: bannerStorage,
//     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
//     fileFilter: (req, file, cb) => {
//       const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
//       if (!file) {
//         cb(null, true);
//         return;
//       }
//       if (allowedTypes.includes(file.mimetype)) {
//         cb(null, true);
//       } else {
//         cb(new ApiError(400, "Chỉ chấp nhận file ảnh (jpg, png, gif)"));
//       }
//     },
//   }).single("image", 1);
//   upload(req, res, (err) => {
//     if (err instanceof multer.MulterError) {
//       if (err.code === "LIMIT_UNEXPECTED_FILE") {
//         return next(new ApiError(400, "Chỉ được phép upload 1 ảnh cho banner"));
//       }
//       return next(new ApiError(400, `Lỗi upload: ${err.message}`));
//     }
//     if (err) {
//       return next(new ApiError(400, err.message));
//     }
//     next();
//   });
// };
const handleUploadBannerImages = (req, res, next) => {
  const upload = multer({
    storage: bannerStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!file) {
        cb(null, true);
        return;
      }
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new ApiError(400, "Only accept image files (jpg, png, gif)"));
      }
    },
  }).single("image");

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return next(new ApiError(400, `Upload error: ${err.message}`));
    }
    if (err) {
      return next(new ApiError(400, err.message));
    }
    next();
  });
};
///////////////////////////////////////////////////////////////
// Middleware for uploading hospital images
// const handleUploadHospitalImages = (req, res, next) => {
//   console.log("Starting hospital image upload...");

//   const upload = multer({
//     storage: hospitalStorage,
//     limits: { fileSize: 5 * 1024 * 1024 },
//     fileFilter: (req, file, cb) => {
//       const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
//       if (allowedTypes.includes(file.mimetype)) {
//         cb(null, true);
//       } else {
//         cb(new ApiError(400, "Chỉ chấp nhận file ảnh (jpg, png, gif)"));
//       }
//     },
//   }).array("images", 5); // Cho phép tối đa 5 ảnh, field name là "images"

//   upload(req, res, function (err) {
//     // console.log("Upload completed");
//     // console.log("Files:", req.files);

//     if (err instanceof multer.MulterError) {
//       return next(new ApiError(400, `Lỗi upload: ${err.message}`));
//     }
//     if (err) {
//       return next(new ApiError(400, err.message));
//     }
//     next();
//   });
// };
const handleUploadHospitalImages = (req, res, next) => {
  const upload = multer({
    storage: hospitalStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new ApiError(400, "Only accept image files (jpg, png, gif)"));
      }
    },
  }).array("images", 5);

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(new ApiError(400, "Only upload up to 5 images"));
      }
      return next(new ApiError(400, `Upload error: ${err.message}`));
    }
    if (err) {
      return next(new ApiError(400, err.message));
    }
    next();
  });
};
////////////////////////////////////////////////////////////
// Add middleware for uploading pet gallery images
const handleUploadPetGalleryImages = (req, res, next) => {
  // Check if there are multiple files in the request
  if (req.files && Object.keys(req.files).length > 0) {
    return next(new ApiError(400, "Only upload 1 image"));
  }

  const upload = multer({
    storage: petGalleryStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      // Check if there is a file uploaded
      if (req.file) {
        return cb(new ApiError(400, "Only upload 1 image"));
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new ApiError(400, "Only accept image files (jpg, png, gif)"));
      }
    },
  }).single("image");

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(new ApiError(400, "Only upload 1 image"));
      }
      return next(new ApiError(400, `Upload error: ${err.message}`));
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
  handleUploadAvatar,
};
