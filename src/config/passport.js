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
        console.log("Google Strategy Profile:", profile);

        // Check if user exists with google_id
        let user = await User.findOne({ google_id: profile.id });

        if (!user) {
          // Check if email is already used
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // If email is already used
            console.log("Found existing user:", user);
            user = await User.update(user.id, {
              google_id: profile.id,
              avatar: profile.photos[0]?.value || user.avatar,
            });
            return done(null, user);
          } else {
            // New user
            const newUserData = {
              isNewUser: true,
              email: profile.emails[0].value,
              full_name: profile.displayName,
              google_id: profile.id,
              avatar: profile.photos[0]?.value,
            };
            console.log("New user data:", newUserData);
            return done(null, newUserData);
          }
        }

        // User already exists with google_id
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
