const HospitalService = require("../services/HospitalService");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../exceptions/ApiError");

class HospitalController {
  // Lấy danh sách bệnh viện với filter và phân trang
  getHospitals = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, ...filters } = req.query;
    const result = await HospitalService.getHospitals(
      filters,
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  });

  // Lấy chi tiết một bệnh viện
  getHospitalById = asyncHandler(async (req, res) => {
    const hospital = await HospitalService.getHospitalById(req.params.id);
    res.json(hospital);
  });

  // Tạo mới bệnh viện
  createHospital = asyncHandler(async (req, res) => {
    // Validate dữ liệu đầu vào
    await HospitalService.validateHospitalData(req.body);

    // Lấy user ID từ request (được set bởi middleware auth)
    const userId = req.user.id;

    const hospital = await HospitalService.createHospital(req.body, userId);
    res.status(201).json(hospital);
  });

  // Cập nhật thông tin bệnh viện
  updateHospital = asyncHandler(async (req, res) => {
    // Validate dữ liệu cập nhật
    await HospitalService.validateHospitalData(req.body, true);

    const hospital = await HospitalService.updateHospital(
      req.params.id,
      req.body
    );
    res.json(hospital);
  });

  // Xóa vĩnh viễn bệnh viện
  hardDelete = asyncHandler(async (req, res) => {
    await HospitalService.hardDelete(req.params.id);
    res.status(204).send();
  });

  // Toggle xóa mềm bệnh viện
  toggleDelete = asyncHandler(async (req, res) => {
    const hospital = await HospitalService.toggleDelete(req.params.id);
    res.json(hospital);
  });

  // Tìm kiếm bệnh viện nâng cao
  searchHospitals = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      sortBy,
      sortOrder,
      fromDate,
      toDate,
      ...searchParams
    } = req.query;

    const result = await HospitalService.searchHospitals(
      {
        ...searchParams,
        fromDate,
        toDate,
        sortBy,
        sortOrder,
      },
      parseInt(page),
      parseInt(limit)
    );

    res.json(result);
  });
}

module.exports = new HospitalController();
