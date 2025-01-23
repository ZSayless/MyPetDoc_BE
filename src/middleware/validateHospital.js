const Hospital = require("../models/Hospital");
const ApiError = require("../exceptions/ApiError");
const cloudinary = require("../config/cloudinary");

const validateHospitalOwnership = async (req, res, next) => {
  try {
    const hospitalId = req.params.id;
    const userId = req.user.id;

    // Skip check if it's ADMIN
    if (req.user.role === "ADMIN") {
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        // Delete uploaded images if any
        if (req.files && req.files.length > 0) {
          for (const file of req.files) {
            try {
              const publicId = file.filename.split("/").pop().split(".")[0];
              await cloudinary.uploader.destroy(`hospitals/${publicId}`);
            } catch (error) {
              console.error("Error deleting image:", error);
            }
          }
        }
        throw new ApiError(404, "Hospital not found");
      }
      req.hospital = hospital;
      return next();
    }

    // Check ownership
    const hospital = await Hospital.findById(hospitalId);

    if (!hospital) {
      // Delete uploaded images if any
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            const publicId = file.filename.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`hospitals/${publicId}`);
          } catch (error) {
            console.error("Error deleting image:", error);
          }
        }
      }
      throw new ApiError(404, "Hospital not found");
    }

    if (hospital.created_by !== userId) {
      // Delete uploaded images if no permission
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            const publicId = file.filename.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`hospitals/${publicId}`);
          } catch (error) {
            console.error("Error deleting image:", error);
          }
        }
      }
      throw new ApiError(403, "You don't have permission to update this hospital");
    }

    // Save hospital to request for later use
    req.hospital = hospital;
    next();
  } catch (error) {
    // Ensure images are deleted in all cases
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const publicId = file.filename.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`hospitals/${publicId}`);
        } catch (deleteError) {
          console.error("Error deleting image:", deleteError);
        }
      }
    }
    next(error);
  }
};

const validateHospital = async (req, res, next) => {
  try {
    const hospitalId = req.params.id;
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new ApiError(404, "Hospital not found");
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { validateHospitalOwnership, validateHospital };
