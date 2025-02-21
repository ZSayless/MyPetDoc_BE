const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.transporter.verify((error, success) => {
      if (error) {
        console.log("SMTP connection error:", error);
      } else {
        console.log("SMTP server is ready to take our messages");
      }
    });
  }

  async sendVerificationEmail(email, token) {
    try {
      const verificationLink = `${process.env.APP_URL}/auth/verify-email/${token}`;

      const mailOptions = {
        from: {
          name: "Pet Hospital System",
          address: process.env.SMTP_FROM,
        },
        to: email,
        subject: "Xác thực tài khoản của bạn",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #444;">Xác thực tài khoản email</h2>
            <p>Cảm ơn bạn đã đăng ký tài khoản. Để hoàn tất quá trình đăng ký, vui lòng click vào nút bên dưới:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="background-color: #4CAF50; 
                        color: white; 
                        padding: 12px 25px; 
                        text-decoration: none; 
                        border-radius: 4px;">
                Xác thực tài khoản
              </a>
            </div>
            <p>Hoặc copy link sau vào trình duyệt:</p>
            <p style="color: #666;">${verificationLink}</p>
            <p style="color: #999; font-size: 14px;">Link này sẽ hết hạn sau 24 giờ.</p>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      // console.log("Email sent: %s", info.messageId);
      return info;
    } catch (error) {
      console.error("Send verification email error:", error);
      throw error;
    }
  }

  async sendResetPasswordEmail(email, token) {
    try {
      const resetLink = `${process.env.APP_URL}/reset-password/${token}`;

      const mailOptions = {
        from: {
          name: "Pet Hospital System",
          address: process.env.SMTP_FROM,
        },
        to: email,
        subject: "Yêu cầu đặt lại mật khẩu",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #444;">Đặt lại mật khẩu</h2>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. 
               Để đặt lại mật khẩu, vui lòng click vào nút bên dưới:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #2196F3; 
                        color: white; 
                        padding: 12px 25px; 
                        text-decoration: none; 
                        border-radius: 4px;">
                Đặt lại mật khẩu
              </a>
            </div>
            <p>Hoặc copy link sau vào trình duyệt:</p>
            <p style="color: #666;">${resetLink}</p>
            <p style="color: #999; font-size: 14px;">Link này sẽ hết hạn sau 1 giờ.</p>
            <p style="color: #999; font-size: 14px;">Nếu bạn không yêu cầu đặt lại mật khẩu, 
               vui lòng bỏ qua email này.</p>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Email sent: %s", info.messageId);
      return info;
    } catch (error) {
      console.error("Send reset password email error:", error);
      throw error;
    }
  }

  async sendContactResponseEmail(
    email,
    { name, subject, originalMessage, responseText }
  ) {
    try {
      const mailOptions = {
        from: {
          name: "Pet Hospital System",
          address: process.env.SMTP_FROM,
        },
        to: email,
        subject: `Phản hồi: ${subject || "Tin nhắn của bạn"}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #444;">Phản hồi tin nhắn của bạn</h2>
            
            <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #ddd;">
              <p style="color: #666; margin: 0;"><strong>Tin nhắn của bạn:</strong></p>
              <p style="color: #444; margin: 10px 0;">${originalMessage}</p>
            </div>

            <div style="margin: 20px 0;">
              <p style="color: #666;"><strong>Phản hồi của chúng tôi:</strong></p>
              <p style="color: #444;">${responseText}</p>
            </div>

            <p style="color: #666; margin-top: 30px;">
              Cảm ơn bạn đã liên hệ với chúng tôi.<br>
              Nếu bạn có thêm câu hỏi, đừng ngần ngại liên hệ lại với chúng tôi.
            </p>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Response email sent: %s", info.messageId);
      return info;
    } catch (error) {
      console.error("Send contact response email error:", error);
      throw error;
    }
  }
}

module.exports = new EmailService();
