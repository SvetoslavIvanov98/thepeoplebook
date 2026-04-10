const router = require('express').Router();
const passport = require('passport');
const { body } = require('express-validator');
const { register, login, refresh, logout, googleCallback, me } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  validate,
], register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
], login);

router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth` }),
  googleCallback
);

module.exports = router;
