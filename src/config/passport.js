const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Kiểm tra user đã tồn tại
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Nếu user tồn tại, cập nhật thông tin Google
          await User.update(user.id, {
            google_id: profile.id,
            avatar: profile.photos[0].value,
            is_active: true,
          });
        } else {
          // Nếu user chưa tồn tại, tạo mới
          user = await User.create({
            email: profile.emails[0].value,
            full_name: profile.displayName,
            google_id: profile.id,
            avatar: profile.photos[0].value,
            role: "GENERAL_USER",
            is_active: true,
            password: Math.random().toString(36).slice(-8), // Random password
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
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
