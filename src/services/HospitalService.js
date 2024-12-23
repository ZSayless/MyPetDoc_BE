const ApiError = require("../exceptions/ApiError");
const Hospital = require("../models/Hospital");

class HospitalService {
  async createHospital(hospitalData, userId) {
    try {
      // Kiểm tra tên bệnh viện đã tồn tại chưa
      if (await Hospital.isNameTaken(hospitalData.name)) {
        throw new ApiError(400, "Tên bệnh viện đã tồn tại");
      }

      // Thêm thông tin người tạo
      const dataToCreate = {
        ...hospitalData,
        created_by: userId,
      };

      const hospital = await Hospital.create(dataToCreate);
      return hospital;
    } catch (error) {
      throw error;
    }
  }

  async getHospitals(searchParams = {}, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      const {
        name,
        address,
        department,
        specialties,
        fromDate,
        toDate,
        ...otherFilters
      } = searchParams;

      // Tìm kiếm bệnh viện với các điều kiện
      const hospitals = await Hospital.search(
        {
          name,
          address,
          department,
          specialties,
          fromDate,
          toDate,
          ...otherFilters,
        },
        { offset, limit }
      );

      // Đếm tổng số kết quả
      const total = await Hospital.countSearch({
        name,
        address,
        department,
        specialties,
        fromDate,
        toDate,
        ...otherFilters,
      });

      return {
        hospitals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getHospitalById(id) {
    try {
      const hospital = await Hospital.findById(id);
      if (!hospital) {
        throw new ApiError(404, "Không tìm thấy bệnh viện");
      }
      return hospital;
    } catch (error) {
      throw error;
    }
  }

  async updateHospital(id, updateData) {
    try {
      const hospital = await this.getHospitalById(id);

      // Kiểm tra nếu cập nhật tên
      if (updateData.name && updateData.name !== hospital.name) {
        if (await Hospital.isNameTaken(updateData.name, id)) {
          throw new ApiError(400, "Tên bệnh viện đã tồn tại");
        }
      }

      const updatedHospital = await Hospital.update(id, updateData);
      return updatedHospital;
    } catch (error) {
      throw error;
    }
  }

  async toggleDelete(id) {
    try {
      const hospital = await this.getHospitalById(id);
      const updateData = {
        is_deleted: !hospital.is_deleted,
      };
      return await Hospital.update(id, updateData);
    } catch (error) {
      throw error;
    }
  }

  async hardDelete(id) {
    try {
      const hospital = await this.getHospitalById(id);
      await Hospital.hardDelete(id);
    } catch (error) {
      throw error;
    }
  }

  async searchHospitals(searchParams = {}, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      // Tìm kiếm bệnh viện
      const hospitals = await Hospital.search(searchParams, {
        offset,
        limit,
        sortBy: searchParams.sortBy || "created_at",
        sortOrder: searchParams.sortOrder || "DESC",
      });

      // Đếm tổng số kết quả
      const total = await Hospital.countSearch(searchParams);

      return {
        hospitals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async validateHospitalData(data, isUpdate = false) {
    const errors = [];

    // Kiểm tra tên bệnh viện
    if (!isUpdate || data.name) {
      if (!data.name || data.name.trim().length < 3) {
        errors.push("Tên bệnh viện phải có ít nhất 3 ký tự");
      }
    }

    // Kiểm tra số điện thoại nếu có
    if (data.contact) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(data.contact)) {
        errors.push("Số điện thoại không hợp lệ");
      }
    }

    // Kiểm tra địa chỉ nếu có
    if (data.address && data.address.trim().length < 5) {
      errors.push("Địa chỉ phải có ít nhất 5 ký tự");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Dữ liệu không hợp lệ", errors);
    }
  }
}

module.exports = new HospitalService();
