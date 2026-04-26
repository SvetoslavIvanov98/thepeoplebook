const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const db = require('./db');

// JWT Strategy
passport.use(
  new JwtStrategy(
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
  )
);

/**
 * Generate a unique username from an email prefix, appending a random suffix on collision.
 */
const generateUniqueUsername = async (emailPrefix) => {
  let base = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 25);
  let username = base;
  let attempts = 0;

  while (attempts < 10) {
    const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (!existing.rows[0]) return username;
    // Append random 4-digit suffix on collision
    username = `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
    attempts++;
  }

  // Fallback: use timestamp
  return `${base}_${Date.now() % 100000}`;
};

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        let result = await db.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [
          profile.id,
          email,
        ]);
        let user = result.rows[0];

        if (!user) {
          const username = await generateUniqueUsername(email.split('@')[0]);
          const insert = await db.query(
            `INSERT INTO users (username, email, full_name, google_id, avatar_url, is_verified)
           VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
            [username, email, profile.displayName, profile.id, profile.photos?.[0]?.value || null]
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
  )
);
