const passport = require('passport');

const authenticate = passport.authenticate('jwt', { session: false });

const optionalAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (user) req.user = user;
    next();
  })(req, res, next);
};

module.exports = { authenticate, optionalAuth };
