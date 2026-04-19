const passport = require('passport');

const authenticate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      const msg = info?.message === 'Account suspended'
        ? 'Your account has been suspended'
        : 'Unauthorized';
      return res.status(401).json({ error: msg });
    }
    req.user = user;
    next();
  })(req, res, next);
};

const optionalAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (user) req.user = user;
    next();
  })(req, res, next);
};

module.exports = { authenticate, optionalAuth };
