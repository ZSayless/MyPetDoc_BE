const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const ApiError = require("../exceptions/ApiError");
const config = require("./config");

const convertBitToBoolean = (bitField) => {
  if (bitField === null || bitField === undefined) return false;
  return Buffer.isBuffer(bitField)
    ? bitField.readInt8(0) === 1
    : Boolean(bitField);
};

// Kiểm tra biến môi trường bắt buộc
const requiredEnvVars = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      proxy: true,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google Strategy Profile:", profile);

        // Kiểm tra user có tồn tại với google_id không
        let user = await User.findOne({ google_id: profile.id });

        if (!user) {
          // Kiểm tra email đã được sử dụng chưa
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Nếu email đã tồn tại (đăng ký thông thường)
            console.log("Found existing user:", user);

            // Liên kết tài khoản hiện tại với Google
            user = await User.update(user.id, {
              google_id: profile.id,
              avatar: profile.photos[0]?.value || user.avatar,
            });
            return done(null, user);
          } else {
            // Đây là user mới hoàn toàn
            return done(null, {
              isNewUser: true,
              profile: {
                email: profile.emails[0].value,
                full_name: profile.displayName,
                google_id: profile.id,
                avatar: profile.photos[0]?.value,
              },
            });
          }
        }

        // User đã tồn tại với google_id
        return done(null, user);
      } catch (error) {
        console.error("Passport Google Strategy Error:", error);
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user);
  done(null, user);
});

passport.deserializeUser((user, done) => {
  console.log("Deserializing user:", user);
  done(null, user);
});

module.exports = passport;
