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

// Check required environment variables
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

        // Kiểm tra user theo email trước
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Nếu user đã tồn tại
          if (user.google_id) {
            if (user.google_id !== profile.id) {
              return done(new ApiError(400, "This email has already been linked to a different Google account"));
            }
          } else {
            // Nếu user chưa có google_id, cập nhật google_id
            user = await User.update(user.id, {
              google_id: profile.id,
              avatar: profile.photos[0]?.value || user.avatar,
            });
          }
          return done(null, user);
        }

        // Nếu không tìm thấy user, tạo user mới
        const newUserData = {
          isNewUser: true,
          email: profile.emails[0].value,
          full_name: profile.displayName,
          google_id: profile.id,
          avatar: profile.photos[0]?.value,
        };
        return done(null, newUserData);

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
