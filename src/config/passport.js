const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const ApiError = require("../exceptions/ApiError");
const bcrypt = require("bcrypt");

const convertBitToBoolean = (bitField) => {
  if (bitField === null || bitField === undefined) return false;
  return Buffer.isBuffer(bitField)
    ? bitField.readInt8(0) === 1
    : Boolean(bitField);
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ google_id: profile.id });

        if (!user) {
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            const isLocked = convertBitToBoolean(user.is_locked);

            if (isLocked) {
              return done(new ApiError(401, "Tài khoản đã bị khóa"));
            }

            user = await User.update(user.id, {
              google_id: profile.id,
              avatar: profile.photos[0]?.value,
            });
          } else {
            const randomPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            user = await User.create({
              email: profile.emails[0].value,
              full_name: profile.displayName,
              google_id: profile.id,
              avatar: profile.photos[0]?.value,
              role: "GENERAL_USER",
              is_active: true,
              is_locked: false,
              password: hashedPassword,
            });
          }
        }

        if (!(user instanceof User)) {
          user = new User(user);
        }

        return done(null, user);
      } catch (error) {
        console.error("Passport error:", error);
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
