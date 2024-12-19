const User = require("../models/User");
const ApiError = require("../exceptions/ApiError");
const emailService = require("../services/emailService");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

class AuthController {
  // Đăng ký tài khoản
  async register(req, res) {
    const { email, password, full_name, role = "GENERAL_USER" } = req.body;

    // Kiểm tra email đã tồn tại
    if (await User.isEmailTaken(email)) {
      throw new ApiError(400, "Email đã được sử dụng");
    }

    // Tạo verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ

    // Tạo user mới
    const user = await User.create({
      email,
      password,
      full_name,
      role,
      is_active: false,
      verification_token: verificationToken,
      verification_expires: verificationExpires,
    });

    // Gửi email xác thực
    await emailService.sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      status: "success",
      message:
        "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
    });
  }

  // Đăng nhập
  async login(req, res) {
    const { email, password } = req.body;

    // Kiểm tra user tồn tại
    const user = await User.findByEmail(email);
    if (!user) {
      throw new ApiError(401, "Email hoặc mật khẩu không đúng");
    }

    // Kiểm tra mật khẩu
    const isPasswordMatch = await user.isPasswordMatch(password);
    if (!isPasswordMatch) {
      throw new ApiError(401, "Email hoặc mật khẩu không đúng");
    }

    // Kiểm tra tài khoản có bị khóa
    if (user.is_locked) {
      throw new ApiError(401, "Tài khoản đã bị khóa");
    }

    // Kiểm tra tài khoản có active
    if (!user.is_active) {
      throw new ApiError(401, "Tài khoản chưa được kích hoạt");
    }

    const token = user.generateAuthToken();

    res.json({
      status: "success",
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
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
}

module.exports = new AuthController();
