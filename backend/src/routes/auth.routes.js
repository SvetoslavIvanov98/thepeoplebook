const router = require('express').Router();
const passport = require('passport');
const { body } = require('express-validator');
const {
  register,
  login,
  refresh,
  logout,
  googleCallback,
  exchangeCode,
  me,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { sanitizeBody } = require('../middleware/sanitize.middleware');

router.post(
  '/register',
  sanitizeBody('username', 'full_name'),
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    validate,
  ],
  register
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty(), validate],
  login
);

router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);

// C-2: Exchange a one-time OAuth code for real tokens
router.post(
  '/exchange',
  [body('code').isString().trim().isLength({ min: 64, max: 64 }), validate],
  exchangeCode
);

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth`,
  }),
  googleCallback
);

module.exports = router;
