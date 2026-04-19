const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const db = require('./db');

// JWT Strategy
passport.use(new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
  },
  async (payload, done) => {
    try {
      const result = await db.query(
        'SELECT id, username, email, avatar_url, is_verified, role, is_banned FROM users WHERE id = $1',
        [payload.sub]
      );
      if (!result.rows[0]) return done(null, false);
      if (result.rows[0].is_banned) return done(null, false, { message: 'Account suspended' });
      return done(null, result.rows[0]);
    } catch (err) {
      return done(err, false);
    }
  }
));

// Google OAuth Strategy
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      let result = await db.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [profile.id, email]);
      let user = result.rows[0];

      if (!user) {
        const insert = await db.query(
          `INSERT INTO users (username, email, full_name, google_id, avatar_url, is_verified)
           VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
          [
            email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_'),
            email,
            profile.displayName,
            profile.id,
            profile.photos?.[0]?.value || null,
          ]
        );
        user = insert.rows[0];
      } else if (!user.google_id) {
        await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, user.id]);
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));
