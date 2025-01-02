const User = require("../models/User");
const ApiError = require("../exceptions/ApiError");
const emailService = require("../services/emailService");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

class AuthController {
  // Đăng ký tài khoản
  register = async (req, res) => {
    const { email, password, full_name, role = "GENERAL_USER" } = req.body;

    // Validate dữ liệu
    await this.validateUserData({ email, password, full_name });

    // Kiểm tra email đã tồn tại
    if (await User.isEmailTaken(email)) {
      throw new ApiError(400, "Email đã được sử dụng");
    }

    // Mã hóa mật khẩu với salt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ

    // Tạo user mới
    const user = await User.create({
      email,
      password: hashedPassword,
      full_name,
      role,
      is_active: false,
      verification_token: verificationToken,
      verification_expires: verificationExpires,
    });

    // Gửi email xác thực
    await emailService.sendVerificationEmail(email, verificationToken);

    // Loại bỏ thông tin nhạy cảm
    delete user.password;
    delete user.verification_token;
    delete user.verification_expires;

    res.status(201).json({
      status: "success",
      message:
        "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
      data: user,
    });
  };

  validateUserData = async (data) => {
    const errors = [];

    // Validate email
    if (!data.email) {
      errors.push("Email là bắt buộc");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push("Email không hợp lệ");
    }

    // Validate mật khẩu
    if (!data.password) {
      errors.push("Mật khẩu là bắt buộc");
    } else if (data.password.length < 6) {
      errors.push("Mật khẩu phải có ít nhất 6 ký tự");
    } else if (!/[A-Z]/.test(data.password)) {
      errors.push("Mật khẩu phải chứa ít nhất 1 chữ hoa");
    } else if (!/[0-9]/.test(data.password)) {
      errors.push("Mật khẩu phải chứa ít nhất 1 số");
    }

    // Validate họ tên
    if (!data.full_name || data.full_name.trim().length < 2) {
      errors.push("Họ tên phải có ít nhất 2 ký tự");
    }

    if (errors.length > 0) {
      throw new ApiError(400, "Dữ liệu không hợp lệ", errors);
    }
  };

  // Đăng nhập
  async login(req, res) {
    const { email, password } = req.body;

    // Kiểm tra user tồn tại
    const user = await User.findByEmail(email);
    if (!user) {
      throw new ApiError(401, "Email hoặc mật khẩu không đúng");
    }

    // Kiểm tra mật khẩu
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new ApiError(401, "Email hoặc mật khẩu không đúng");
    }

    // Kiểm tra tài khoản có bị khóa
    if (user.is_locked) {
      throw new ApiError(401, "Tài khoản đã bị khóa");
    }

    // Kiểm tra tài khoản có active
    if (!user.is_active) {
      // Kiểm tra token xác thực đã hết hạn chưa
      if (
        !user.verification_token ||
        new Date() > new Date(user.verification_expires)
      ) {
        // Tạo verification token mới
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Cập nhật token mới
        await User.update(user.id, {
          verification_token: verificationToken,
          verification_expires: verificationExpires,
        });

        // Gửi lại email xác thực
        await emailService.sendVerificationEmail(user.email, verificationToken);

        throw new ApiError(
          401,
          "Mã xác thực đã hết hạn. Chúng tôi đã gửi lại mã xác thực mới vào email của bạn."
        );
      }

      throw new ApiError(
        401,
        "Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để xác thực tài khoản."
      );
    }

    // Tạo token và loại bỏ thông tin nhạy cảm
    const token = user.generateAuthToken();
    delete user.password;
    delete user.verification_token;
    delete user.verification_expires;
    delete user.reset_password_token;
    delete user.reset_password_expires;

    res.json({
      status: "success",
      data: {
        user,
        token,
      },
    });
  }

  async verifyEmail(req, res) {
    const { token } = req.params;

    const user = await User.findOne({
      verification_token: token,
      is_active: false,
    });

    if (!user) {
      throw new ApiError(400, "Token không hợp lệ hoặc đã hết hạn");
    }

    if (new Date() > new Date(user.verification_expires)) {
      throw new ApiError(400, "Token đã hết hạn");
    }

    await User.update(user.id, {
      is_active: true,
      verification_token: null,
      verification_expires: null,
    });

    res.json({
      status: "success",
      message: "Xác thực email thành công",
    });
  }

  async forgotPassword(req, res) {
    const { email } = req.body;
    const user = await User.findByEmail(email);

    if (!user) {
      throw new ApiError(404, "Email không tồn tại");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

    await User.update(user.id, {
      reset_password_token: resetToken,
      reset_password_expires: resetExpires,
    });

    await emailService.sendResetPasswordEmail(email, resetToken);

    res.json({
      status: "success",
      message: "Email đặt lại mật khẩu đã được gửi",
    });
  }

  async resetPassword(req, res) {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      reset_password_token: token,
    });

    if (!user) {
      throw new ApiError(400, "Token không hợp lệ hoặc đã hết hạn");
    }

    if (new Date() > new Date(user.reset_password_expires)) {
      throw new ApiError(400, "Token đã hết hạn");
    }

    await User.update(user.id, {
      password: await bcrypt.hash(password, 10),
      reset_password_token: null,
      reset_password_expires: null,
    });

    res.json({
      status: "success",
      message: "Đặt lại mật khẩu thành công",
    });
  }

  async googleCallback(req, res) {
    try {
      const userData = req.user;

      if (userData.isNewUser) {
        // Nếu là user mới, trả về trạng thái chờ chọn role
        res.json({
          status: "pending_role",
          message: "Vui lòng chọn loại tài khoản",
          data: {
            profile: userData.profile,
          },
        });
        return;
      }

      const token = userData.generateAuthToken();
      res.json({
        status: "success",
        message: "Đăng nhập thành công",
        data: {
          user: {
            id: userData.id,
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role,
            avatar: userData.avatar,
          },
          token,
        },
      });
    } catch (error) {
      console.error("Google callback error:", error);
      res.status(error.statusCode || 500).json({
        status: "error",
        message: error.message || "Xác thực thất bại",
      });
    }
  }

  // Thêm method mới để hoàn tất đăng ký Google
  async completeGoogleSignup(req, res) {
    const { email, full_name, google_id, avatar, role } = req.body;

    if (!["GENERAL_USER", "HOSPITAL_ADMIN"].includes(role)) {
      throw new ApiError(400, "Role không hợp lệ");
    }

    // Kiểm tra email đã tồn tại
    if (await User.isEmailTaken(email)) {
      throw new ApiError(400, "Email đã được sử dụng");
    }

    const randomPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    console.log("User data before create:", {
      email,
      full_name,
      google_id,
      avatar,
      role,
      hashedPassword,
    });

    // Tạo user mới với các giá trị mặc định cho các trường bắt buộc
    let user = await User.create({
      email,
      full_name,
      google_id: google_id || null, // Cho phép null nếu không có
      avatar: avatar || null, // Cho phép null nếu không có
      role,
      is_active: true,
      is_locked: false,
      password: hashedPassword,
      verification_token: null, // Thêm các trường bắt buộc
      verification_expires: null,
      reset_password_token: null,
      reset_password_expires: null,
      hospital_id: null, // Nếu là HOSPITAL_ADMIN, có thể cập nhật sau
    });

    // Lấy thông tin user đầy đủ sau khi tạo
    user = await User.findById(user.id);

    if (!user) {
      throw new ApiError(500, "Lỗi khi tạo tài khoản");
    }

    const token = user.generateAuthToken();

    // Loại bỏ các thông tin nhạy cảm
    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar: user.avatar,
      is_active: user.is_active,
      created_at: user.created_at,
    };

    res.json({
      status: "success",
      message: "Đăng ký thành công",
      data: {
        user: userResponse,
        token,
      },
    });
  }
}

module.exports = new AuthController();
