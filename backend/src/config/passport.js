const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const prisma = require('./prisma');

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        const user = await prisma.users.findUnique({
          where: { id: BigInt(payload.sub) },
          select: {
            id: true,
            username: true,
            email: true,
            avatar_url: true,
            is_verified: true,
            role: true,
            is_banned: true,
          },
        });
        if (!user) return done(null, false);
        if (user.is_banned) return done(null, false, { message: 'Account suspended' });
        return done(null, user);
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
    const existing = await prisma.users.findUnique({ where: { username } });
    if (!existing) return username;
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
        let user = await prisma.users.findFirst({
          where: {
            OR: [{ google_id: profile.id }, { email: email }],
          },
        });

        if (!user) {
          const username = await generateUniqueUsername(email.split('@')[0]);
          user = await prisma.users.create({
            data: {
              username,
              email,
              full_name: profile.displayName,
              google_id: profile.id,
              avatar_url: profile.photos?.[0]?.value || null,
              is_verified: true,
            },
          });
        } else if (!user.google_id) {
          user = await prisma.users.update({
            where: { id: user.id },
            data: { google_id: profile.id },
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);
